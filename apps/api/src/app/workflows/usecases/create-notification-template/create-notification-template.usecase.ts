import { Injectable, NotFoundException } from '@nestjs/common';
import slugify from 'slugify';
import * as shortid from 'shortid';

import {
  NotificationTemplateRepository,
  NotificationGroupEntity,
  NotificationStepEntity,
  FeedRepository,
  NotificationGroupRepository,
} from '@novu/dal';
import {
  ChangeEntityTypeEnum,
  INotificationTemplateStep,
  INotificationTrigger,
  TriggerTypeEnum,
  IStepVariant,
} from '@novu/shared';
import { AnalyticsService, CreateChange, CreateChangeCommand } from '@novu/application-generic';

import { CreateNotificationTemplateCommand, NotificationStepVariant } from './create-notification-template.command';
import { ContentService } from '../../../shared/helpers/content.service';
import { CreateMessageTemplate, CreateMessageTemplateCommand } from '../../../message-template/usecases';
import { ApiException } from '../../../shared/exceptions/api.exception';

/**
 * DEPRECATED:
 * This usecase is deprecated and will be removed in the future.
 * Please use the CreateWorkflow usecase instead.
 */
@Injectable()
export class CreateNotificationTemplate {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private createMessageTemplate: CreateMessageTemplate,
    private notificationGroupRepository: NotificationGroupRepository,
    private feedRepository: FeedRepository,
    private createChange: CreateChange,
    private analyticsService: AnalyticsService
  ) {}

  async execute(usecaseCommand: CreateNotificationTemplateCommand) {
    const blueprintCommand = await this.processBlueprint(usecaseCommand);
    const command = blueprintCommand ?? usecaseCommand;

    this.validatePayload(command);

    const triggerIdentifier = `${slugify(command.name, {
      lower: true,
      strict: true,
    })}`;
    const parentChangeId: string = NotificationTemplateRepository.createObjectId();

    const [templateSteps, trigger] = await Promise.all([
      this.storeTemplateSteps(command, parentChangeId),
      this.createNotificationTrigger(command, triggerIdentifier),
    ]);

    const storedWorkflow = await this.storeWorkflow(command, templateSteps, trigger, triggerIdentifier);

    await this.createWorkflowChange(command, storedWorkflow, parentChangeId);

    return storedWorkflow;
  }

  private validatePayload(command: CreateNotificationTemplateCommand) {
    const variants = command.steps ? command.steps?.flatMap((step) => step.variants || []) : [];

    for (const variant of variants) {
      if (!variant.filters?.length) {
        throw new ApiException(`Variant conditions are required, variant name ${variant.name} id ${variant._id}`);
      }
    }
  }

  private async createNotificationTrigger(
    command: CreateNotificationTemplateCommand,
    triggerIdentifier: string
  ): Promise<INotificationTrigger> {
    const contentService = new ContentService();
    const { variables, reservedVariables } = contentService.extractMessageVariables(command.steps);
    const subscriberVariables = contentService.extractSubscriberMessageVariables(command.steps);

    const templateCheckIdentifier = await this.notificationTemplateRepository.findByTriggerIdentifier(
      command.environmentId,
      triggerIdentifier
    );

    const trigger: INotificationTrigger = {
      type: TriggerTypeEnum.EVENT,
      identifier: `${triggerIdentifier}${!templateCheckIdentifier ? '' : '-' + shortid.generate()}`,
      variables: variables.map((i) => {
        return {
          name: i.name,
          type: i.type,
        };
      }),
      reservedVariables: reservedVariables.map((i) => {
        return {
          type: i.type,
          variables: i.variables.map((variable) => {
            return {
              name: variable.name,
              type: variable.type,
            };
          }),
        };
      }),
      subscriberVariables: subscriberVariables.map((i) => {
        return {
          name: i,
        };
      }),
    };

    return trigger;
  }

  private sendTemplateCreationEvent(command: CreateNotificationTemplateCommand, triggerIdentifier: string) {
    if (command.name !== 'On-boarding notification' && !command.__source?.startsWith('onboarding_')) {
      this.analyticsService.track('Create Notification Template - [Platform]', command.userId, {
        _organization: command.organizationId,
        steps: command.steps?.length,
        channels: command.steps?.map((i) => i.template?.type),
        __source: command.__source,
        triggerIdentifier,
      });
    }
  }

  private async createWorkflowChange(command: CreateNotificationTemplateCommand, item, parentChangeId: string) {
    await this.createChange.execute(
      CreateChangeCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        type: ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE,
        item,
        changeId: parentChangeId,
      })
    );
  }

  private async storeWorkflow(
    command: CreateNotificationTemplateCommand,
    templateSteps: INotificationTemplateStep[],
    trigger: INotificationTrigger,
    triggerIdentifier: string
  ) {
    const savedWorkflow = await this.notificationTemplateRepository.create({
      _organizationId: command.organizationId,
      _creatorId: command.userId,
      _environmentId: command.environmentId,
      name: command.name,
      active: command.active,
      draft: command.draft,
      critical: command.critical,
      preferenceSettings: command.preferenceSettings,
      tags: command.tags,
      description: command.description,
      steps: templateSteps,
      triggers: [trigger],
      _notificationGroupId: command.notificationGroupId,
      blueprintId: command.blueprintId,
      ...(command.data ? { data: command.data } : {}),
    });

    const item = await this.notificationTemplateRepository.findById(savedWorkflow._id, command.environmentId);
    if (!item) throw new NotFoundException(`Workflow ${savedWorkflow._id} is not found`);

    this.sendTemplateCreationEvent(command, triggerIdentifier);

    return item;
  }

  private async storeTemplateSteps(
    command: CreateNotificationTemplateCommand,
    parentChangeId: string
  ): Promise<INotificationTemplateStep[]> {
    let parentStepId: string | null = null;
    const templateSteps: INotificationTemplateStep[] = [];

    for (const message of command.steps) {
      if (!message.template) throw new ApiException(`Unexpected error: message template is missing`);

      const [template, storedVariants] = await Promise.all([
        await this.createMessageTemplate.execute(
          CreateMessageTemplateCommand.create({
            organizationId: command.organizationId,
            environmentId: command.environmentId,
            userId: command.userId,
            type: message.template.type,
            name: message.template.name,
            content: message.template.content,
            variables: message.template.variables,
            contentType: message.template.contentType,
            cta: message.template.cta,
            subject: message.template.subject,
            title: message.template.title,
            feedId: message.template.feedId,
            layoutId: message.template.layoutId,
            preheader: message.template.preheader,
            senderName: message.template.senderName,
            actor: message.template.actor,
            parentChangeId,
          })
        ),
        await this.storeVariantSteps({
          variants: message.variants,
          parentChangeId: parentChangeId,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          userId: command.userId,
        }),
      ]);

      const stepId = template._id;
      const templateStep: Partial<INotificationTemplateStep> = {
        _id: stepId,
        _templateId: template._id,
        filters: message.filters,
        _parentId: parentStepId,
        active: message.active,
        shouldStopOnFail: message.shouldStopOnFail,
        replyCallback: message.replyCallback,
        uuid: message.uuid,
        name: message.name,
        metadata: message.metadata,
      };

      if (storedVariants.length) {
        templateStep.variants = storedVariants;
      }

      templateSteps.push(templateStep);

      if (stepId) {
        parentStepId = stepId;
      }
    }

    return templateSteps;
  }

  private async storeVariantSteps({
    variants,
    parentChangeId,
    organizationId,
    environmentId,
    userId,
  }: {
    variants: NotificationStepVariant[] | undefined;
    parentChangeId: string;
    organizationId: string;
    environmentId: string;
    userId: string;
  }): Promise<IStepVariant[]> {
    if (!variants?.length) return [];

    const variantsList: IStepVariant[] = [];
    let parentVariantId: string | null = null;

    for (const variant of variants) {
      if (!variant.template) throw new ApiException(`Unexpected error: variants message template is missing`);

      const variantTemplate = await this.createMessageTemplate.execute(
        CreateMessageTemplateCommand.create({
          organizationId: organizationId,
          environmentId: environmentId,
          userId: userId,
          type: variant.template.type,
          name: variant.template.name,
          content: variant.template.content,
          variables: variant.template.variables,
          contentType: variant.template.contentType,
          cta: variant.template.cta,
          subject: variant.template.subject,
          title: variant.template.title,
          feedId: variant.template.feedId,
          layoutId: variant.template.layoutId,
          preheader: variant.template.preheader,
          senderName: variant.template.senderName,
          actor: variant.template.actor,
          parentChangeId,
        })
      );

      variantsList.push({
        _id: variantTemplate._id,
        _templateId: variantTemplate._id,
        filters: variant.filters,
        _parentId: parentVariantId,
        active: variant.active,
        shouldStopOnFail: variant.shouldStopOnFail,
        replyCallback: variant.replyCallback,
        uuid: variant.uuid,
        name: variant.name,
        metadata: variant.metadata,
      });

      if (variantTemplate._id) {
        parentVariantId = variantTemplate._id;
      }
    }

    return variantsList;
  }

  private async processBlueprint(command: CreateNotificationTemplateCommand) {
    if (!command.blueprintId) return null;

    const group: NotificationGroupEntity = await this.handleGroup(command.notificationGroupId, command);
    const steps: NotificationStepEntity[] = await this.handleFeeds(command.steps as any, command);

    return CreateNotificationTemplateCommand.create({
      organizationId: command.organizationId,
      userId: command.userId,
      environmentId: command.environmentId,
      name: command.name,
      tags: command.tags,
      description: command.description,
      steps: steps,
      notificationGroupId: group._id,
      active: command.active ?? false,
      draft: command.draft ?? true,
      critical: command.critical ?? false,
      preferenceSettings: command.preferenceSettings,
      blueprintId: command.blueprintId,
      __source: command.__source,
    });
  }

  private async handleFeeds(
    steps: NotificationStepEntity[],
    command: CreateNotificationTemplateCommand
  ): Promise<NotificationStepEntity[]> {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      if (!step.template?._feedId) {
        continue;
      }

      const blueprintFeed = await this.feedRepository.findOne({
        _organizationId: this.getBlueprintOrganizationId,
        _id: step.template._feedId,
      });

      if (!blueprintFeed) {
        step.template._feedId = undefined;
        steps[i] = step;
        continue;
      }

      let feedItem = await this.feedRepository.findOne({
        _organizationId: command.organizationId,
        identifier: blueprintFeed.identifier,
      });

      if (!feedItem) {
        feedItem = await this.feedRepository.create({
          name: blueprintFeed.name,
          identifier: blueprintFeed.identifier,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        });

        await this.createChange.execute(
          CreateChangeCommand.create({
            item: feedItem,
            type: ChangeEntityTypeEnum.FEED,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            userId: command.userId,
            changeId: FeedRepository.createObjectId(),
          })
        );
      }

      step.template._feedId = feedItem._id;
      steps[i] = step;
    }

    return steps;
  }

  private async handleGroup(
    notificationGroupId: string,
    command: CreateNotificationTemplateCommand
  ): Promise<NotificationGroupEntity> {
    const blueprintNotificationGroup = await this.notificationGroupRepository.findOne({
      _id: notificationGroupId,
      _organizationId: this.getBlueprintOrganizationId,
    });

    if (!blueprintNotificationGroup)
      throw new NotFoundException(`Blueprint workflow group with id ${notificationGroupId} is not found`);

    let group = await this.notificationGroupRepository.findOne({
      name: blueprintNotificationGroup.name,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (!group) {
      group = await this.notificationGroupRepository.create({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        name: blueprintNotificationGroup.name,
      });

      await this.createChange.execute(
        CreateChangeCommand.create({
          item: group,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
          type: ChangeEntityTypeEnum.NOTIFICATION_GROUP,
          changeId: NotificationGroupRepository.createObjectId(),
        })
      );
    }

    return group;
  }
  private get getBlueprintOrganizationId(): string {
    return NotificationTemplateRepository.getBlueprintOrganizationId() as string;
  }
}
