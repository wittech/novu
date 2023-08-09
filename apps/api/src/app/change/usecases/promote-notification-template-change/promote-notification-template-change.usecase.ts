import { forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  ChangeRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  MessageTemplateRepository,
  NotificationStepEntity,
  NotificationGroupRepository,
} from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';
import {
  buildGroupedBlueprintsKey,
  buildNotificationTemplateIdentifierKey,
  buildNotificationTemplateKey,
  InvalidateCacheService,
} from '@novu/application-generic';

import { ApplyChange, ApplyChangeCommand } from '../apply-change';
import { PromoteTypeChangeCommand } from '../promote-type-change.command';

@Injectable()
export class PromoteNotificationTemplateChange {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private messageTemplateRepository: MessageTemplateRepository,
    private notificationGroupRepository: NotificationGroupRepository,
    @Inject(forwardRef(() => ApplyChange)) private applyChange: ApplyChange,
    private changeRepository: ChangeRepository
  ) {}

  async execute(command: PromoteTypeChangeCommand) {
    await this.invalidateBlueprints(command);

    const item = await this.notificationTemplateRepository.findOne({
      _environmentId: command.environmentId,
      _parentId: command.item._id,
    });

    const newItem = command.item as NotificationTemplateEntity;

    const messages = await this.messageTemplateRepository.find({
      _environmentId: command.environmentId,
      _parentId: {
        $in: newItem.steps ? newItem.steps.map((step) => step._templateId) : [],
      },
    });

    const missingMessages: string[] = [];

    const mapNewStepItem = (step: NotificationStepEntity) => {
      const oldMessage = messages.find((message) => {
        return message._parentId === step._templateId;
      });

      if (!oldMessage) {
        missingMessages.push(step._templateId);

        return undefined;
      }

      if (step?._templateId && oldMessage._id) {
        step._templateId = oldMessage._id;
      }

      return step;
    };

    const steps = newItem.steps
      ? newItem.steps.map(mapNewStepItem).filter((step): step is NotificationStepEntity => step !== undefined)
      : [];

    if (missingMessages.length > 0 && steps.length > 0 && item) {
      Logger.error(
        `Message templates with ids ${missingMessages.join(', ')} are missing for notification template ${item._id}`
      );
    }

    let notificationGroup = await this.notificationGroupRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _parentId: newItem._notificationGroupId,
    });

    if (!notificationGroup) {
      const changes = await this.changeRepository.getEntityChanges(
        command.organizationId,
        ChangeEntityTypeEnum.NOTIFICATION_GROUP,
        newItem._notificationGroupId
      );

      for (const change of changes) {
        await this.applyChange.execute(
          ApplyChangeCommand.create({
            changeId: change._id,
            environmentId: change._environmentId,
            organizationId: change._organizationId,
            userId: command.userId,
          })
        );
      }
      notificationGroup = await this.notificationGroupRepository.findOne({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _parentId: newItem._notificationGroupId,
      });
    }

    if (!notificationGroup) {
      throw new NotFoundException(
        `Notification Group Id ${newItem._notificationGroupId} not found, Notification Template: ${newItem.name}`
      );
    }

    if (!item) {
      if (newItem.deleted) {
        return;
      }

      const newNotificationTemplate: Partial<NotificationTemplateEntity> = {
        name: newItem.name,
        active: newItem.active,
        draft: newItem.draft,
        description: newItem.description,
        tags: newItem.tags,
        critical: newItem.critical,
        triggers: newItem.triggers,
        preferenceSettings: newItem.preferenceSettings,
        steps,
        _parentId: command.item._id,
        _creatorId: command.userId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _notificationGroupId: notificationGroup._id,
        isBlueprint: command.organizationId === this.blueprintOrganizationId,
        blueprintId: newItem.blueprintId,
        ...(newItem.data ? { data: newItem.data } : {}),
      };

      return this.notificationTemplateRepository.create(newNotificationTemplate as NotificationTemplateEntity);
    }

    const count = await this.notificationTemplateRepository.count({
      _organizationId: command.organizationId,
      _id: command.item._id,
    });

    if (count === 0) {
      await this.notificationTemplateRepository.delete({ _environmentId: command.environmentId, _id: item._id });

      return;
    }

    await this.invalidateCache.invalidateByKey({
      key: buildNotificationTemplateKey({
        _id: newItem._id,
        _environmentId: command.environmentId,
      }),
    });

    await this.invalidateCache.invalidateByKey({
      key: buildNotificationTemplateIdentifierKey({
        templateIdentifier: newItem.triggers[0].identifier,
        _environmentId: command.environmentId,
      }),
    });

    return await this.notificationTemplateRepository.update(
      {
        _environmentId: command.environmentId,
        _id: item._id,
      },
      {
        name: newItem.name,
        active: newItem.active,
        draft: newItem.draft,
        description: newItem.description,
        tags: newItem.tags,
        critical: newItem.critical,
        triggers: newItem.triggers,
        preferenceSettings: newItem.preferenceSettings,
        steps,
        _notificationGroupId: notificationGroup._id,
        isBlueprint: command.organizationId === this.blueprintOrganizationId,
        ...(newItem.data ? { data: newItem.data } : {}),
      }
    );
  }

  private async invalidateBlueprints(command: PromoteTypeChangeCommand) {
    if (command.organizationId === this.blueprintOrganizationId) {
      await this.invalidateCache.invalidateByKey({
        key: buildGroupedBlueprintsKey(),
      });
    }
  }

  private get blueprintOrganizationId() {
    return NotificationTemplateRepository.getBlueprintOrganizationId();
  }
}
