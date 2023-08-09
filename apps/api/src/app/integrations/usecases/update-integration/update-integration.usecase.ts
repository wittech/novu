import { BadRequestException, Injectable, NotFoundException, Inject, Logger, ConflictException } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';
import {
  AnalyticsService,
  encryptCredentials,
  buildIntegrationKey,
  InvalidateCacheService,
  GetFeatureFlag,
  FeatureFlagCommand,
} from '@novu/application-generic';
import { ChannelTypeEnum, CHANNELS_WITH_PRIMARY } from '@novu/shared';

import { UpdateIntegrationCommand } from './update-integration.command';
import { DeactivateSimilarChannelIntegrations } from '../deactivate-integration/deactivate-integration.usecase';
import { CheckIntegration } from '../check-integration/check-integration.usecase';
import { CheckIntegrationCommand } from '../check-integration/check-integration.command';
import { DisableNovuIntegration } from '../disable-novu-integration/disable-novu-integration.usecase';

@Injectable()
export class UpdateIntegration {
  @Inject()
  private checkIntegration: CheckIntegration;
  constructor(
    private invalidateCache: InvalidateCacheService,
    private integrationRepository: IntegrationRepository,
    private deactivateSimilarChannelIntegrations: DeactivateSimilarChannelIntegrations,
    private analyticsService: AnalyticsService,
    private getFeatureFlag: GetFeatureFlag,
    private disableNovuIntegration: DisableNovuIntegration
  ) {}

  private async calculatePriorityAndPrimaryForActive({
    existingIntegration,
  }: {
    existingIntegration: IntegrationEntity;
  }) {
    const result: { primary: boolean; priority: number } = {
      primary: existingIntegration.primary,
      priority: existingIntegration.priority,
    };

    const isChannelSupportsPrimary = CHANNELS_WITH_PRIMARY.includes(existingIntegration.channel);

    const highestPriorityIntegration = await this.integrationRepository.findHighestPriorityIntegration({
      _organizationId: existingIntegration._organizationId,
      _environmentId: existingIntegration._environmentId,
      channel: existingIntegration.channel,
    });

    if (highestPriorityIntegration?.primary) {
      result.priority = highestPriorityIntegration.priority;
      await this.integrationRepository.update(
        {
          _id: highestPriorityIntegration._id,
          _organizationId: highestPriorityIntegration._organizationId,
          _environmentId: highestPriorityIntegration._environmentId,
        },
        {
          $set: {
            priority: highestPriorityIntegration.priority + 1,
          },
        }
      );
    } else {
      result.priority = highestPriorityIntegration ? highestPriorityIntegration.priority + 1 : 1;
    }

    const activeIntegrationsCount = await this.integrationRepository.countActiveExcludingNovu({
      _organizationId: existingIntegration._organizationId,
      _environmentId: existingIntegration._environmentId,
      channel: existingIntegration.channel,
    });
    if (activeIntegrationsCount === 0 && isChannelSupportsPrimary) {
      result.primary = true;
    }

    return result;
  }

  private async calculatePriorityAndPrimary({
    existingIntegration,
    active,
  }: {
    existingIntegration: IntegrationEntity;
    active: boolean;
  }) {
    let result: { primary: boolean; priority: number } = {
      primary: existingIntegration.primary,
      priority: existingIntegration.priority,
    };

    if (active) {
      result = await this.calculatePriorityAndPrimaryForActive({
        existingIntegration,
      });
    } else {
      await this.integrationRepository.recalculatePriorityForAllActive({
        _id: existingIntegration._id,
        _organizationId: existingIntegration._organizationId,
        _environmentId: existingIntegration._environmentId,
        channel: existingIntegration.channel,
        exclude: true,
      });

      result = {
        priority: 0,
        primary: false,
      };
    }

    return result;
  }

  async execute(command: UpdateIntegrationCommand): Promise<IntegrationEntity> {
    Logger.verbose('Executing Update Integration Command');

    const existingIntegration = await this.integrationRepository.findById(command.integrationId);
    if (!existingIntegration) {
      throw new NotFoundException(`Entity with id ${command.integrationId} not found`);
    }

    const identifierHasChanged = command.identifier && command.identifier !== existingIntegration.identifier;
    if (identifierHasChanged) {
      const existingIntegrationWithIdentifier = await this.integrationRepository.findOne({
        _organizationId: command.organizationId,
        identifier: command.identifier,
      });

      if (existingIntegrationWithIdentifier) {
        throw new ConflictException('Integration with identifier already exists');
      }
    }

    this.analyticsService.track('Update Integration - [Integrations]', command.userId, {
      providerId: existingIntegration.providerId,
      channel: existingIntegration.channel,
      _organization: command.organizationId,
      active: command.active,
    });

    await this.invalidateCache.invalidateQuery({
      key: buildIntegrationKey().invalidate({
        _organizationId: command.organizationId,
      }),
    });

    const environmentId = command.environmentId ?? existingIntegration._environmentId;

    if (command.check) {
      await this.checkIntegration.execute(
        CheckIntegrationCommand.create({
          environmentId,
          organizationId: command.organizationId,
          credentials: command.credentials,
          providerId: existingIntegration.providerId,
          channel: existingIntegration.channel,
        })
      );
    }

    const updatePayload: Partial<IntegrationEntity> = {};
    const isActiveDefined = typeof command.active !== 'undefined';
    const isActiveChanged = isActiveDefined && existingIntegration.active !== command.active;

    if (command.name) {
      updatePayload.name = command.name;
    }

    if (identifierHasChanged) {
      updatePayload.identifier = command.identifier;
    }

    if (command.environmentId) {
      updatePayload._environmentId = environmentId;
    }

    if (isActiveDefined) {
      updatePayload.active = command.active;
    }

    if (command.credentials) {
      updatePayload.credentials = encryptCredentials(command.credentials);
    }

    if (!Object.keys(updatePayload).length) {
      throw new BadRequestException('No properties found for update');
    }

    const isMultiProviderConfigurationEnabled = await this.getFeatureFlag.isMultiProviderConfigurationEnabled(
      FeatureFlagCommand.create({
        userId: command.userId,
        organizationId: command.organizationId,
        environmentId: command.userEnvironmentId,
      })
    );

    const isChannelSupportsPrimary = CHANNELS_WITH_PRIMARY.includes(existingIntegration.channel);
    if (isMultiProviderConfigurationEnabled && isActiveChanged && isChannelSupportsPrimary) {
      const { primary, priority } = await this.calculatePriorityAndPrimary({
        existingIntegration,
        active: !!command.active,
      });

      updatePayload.primary = primary;
      updatePayload.priority = priority;
    }

    await this.integrationRepository.update(
      {
        _id: existingIntegration._id,
        _environmentId: existingIntegration._environmentId,
      },
      {
        $set: updatePayload,
      }
    );

    if (
      !isMultiProviderConfigurationEnabled &&
      command.active &&
      ![ChannelTypeEnum.CHAT, ChannelTypeEnum.PUSH].includes(existingIntegration.channel)
    ) {
      await this.deactivateSimilarChannelIntegrations.execute({
        environmentId,
        organizationId: command.organizationId,
        integrationId: command.integrationId,
        channel: existingIntegration.channel,
        userId: command.userId,
      });
    }

    const updatedIntegration = await this.integrationRepository.findOne({
      _id: command.integrationId,
      _environmentId: environmentId,
    });
    if (!updatedIntegration) {
      throw new NotFoundException(`Integration with id ${command.integrationId} is not found`);
    }

    if (updatedIntegration.active) {
      await this.disableNovuIntegration.execute({
        channel: updatedIntegration.channel,
        providerId: updatedIntegration.providerId,
        environmentId: updatedIntegration._environmentId,
        organizationId: updatedIntegration._organizationId,
        userId: command.userId,
      });
    }

    return updatedIntegration;
  }
}
