import {
  GetIsApiRateLimitingEnabled,
  GetIsTemplateStoreEnabled,
  GetIsTopicNotificationEnabled,
  GetIsTranslationManagerEnabled,
} from './index';
import { FeatureFlagCommand } from './get-feature-flag.command';
import { FeatureFlagsService } from '../../services';

const originalLaunchDarklySdkKey = process.env.LAUNCH_DARKLY_SDK_KEY;

describe('Get Feature Flag', () => {
  let featureFlagCommand: FeatureFlagCommand;

  describe('Provider: Launch Darkly', () => {
    describe('No SDK key environment variable is set', () => {
      beforeEach(async () => {
        process.env.LAUNCH_DARKLY_SDK_KEY = '';

        featureFlagCommand = FeatureFlagCommand.create({
          environmentId: 'environmentId',
          organizationId: 'organizationId',
          userId: 'userId',
        });
      });

      describe('IS_TEMPLATE_STORE_ENABLED', () => {
        it('should return default hardcoded value when no SDK env is set and no feature flag is set', async () => {
          process.env.IS_TEMPLATE_STORE_ENABLED = '';

          const getIsTemplateStoreEnabled = new GetIsTemplateStoreEnabled(
            new FeatureFlagsService()
          );

          const result = await getIsTemplateStoreEnabled.execute(
            featureFlagCommand
          );
          expect(result).toEqual(false);
        });

        it('should return env variable value when no SDK env is set but the feature flag is set', async () => {
          process.env.IS_TEMPLATE_STORE_ENABLED = 'true';

          const getIsTemplateStoreEnabled = new GetIsTemplateStoreEnabled(
            new FeatureFlagsService()
          );

          const result = await getIsTemplateStoreEnabled.execute(
            featureFlagCommand
          );
          expect(result).toEqual(true);
        });
      });

      describe('IS_TOPIC_NOTIFICATION_ENABLED', () => {
        it('should return default hardcoded value when no SDK env is set and no feature flag is set', async () => {
          process.env.FF_IS_TOPIC_NOTIFICATION_ENABLED = '';

          const getIsTopicNotificationEnabled =
            new GetIsTopicNotificationEnabled(new FeatureFlagsService());

          const result = await getIsTopicNotificationEnabled.execute(
            featureFlagCommand
          );
          expect(result).toEqual(true);
        });

        it('should return env variable value when no SDK env is set but the feature flag is set', async () => {
          process.env.FF_IS_TOPIC_NOTIFICATION_ENABLED = 'false';

          const getIsTopicNotificationEnabled =
            new GetIsTopicNotificationEnabled(new FeatureFlagsService());

          const result = await getIsTopicNotificationEnabled.execute(
            featureFlagCommand
          );
          expect(result).toEqual(false);
        });
      });

      describe('IS_API_RATE_LIMITING_ENABLED', () => {
        it('should return default hardcoded value when no SDK env is set and no feature flag is set', async () => {
          process.env.IS_API_RATE_LIMITING_ENABLED = '';

          const getIsApiRateLimitingEnabled = new GetIsApiRateLimitingEnabled(
            new FeatureFlagsService()
          );

          const result = await getIsApiRateLimitingEnabled.execute(
            featureFlagCommand
          );
          expect(result).toEqual(false);
        });

        it('should return env variable value when no SDK env is set but the feature flag is set', async () => {
          process.env.IS_API_RATE_LIMITING_ENABLED = 'true';

          const getIsApiRateLimitingEnabled = new GetIsApiRateLimitingEnabled(
            new FeatureFlagsService()
          );

          const result = await getIsApiRateLimitingEnabled.execute(
            featureFlagCommand
          );
          expect(result).toEqual(true);
        });
      });

      describe('IS_TRANSLATION_MANAGER_ENABLED', () => {
        it('should return default hardcoded value when no SDK env is set and no feature flag is set', async () => {
          process.env.IS_TRANSLATION_MANAGER_ENABLED = '';

          const getIsTranslationManagerEnabled =
            new GetIsTranslationManagerEnabled(new FeatureFlagsService());

          const result = await getIsTranslationManagerEnabled.execute(
            featureFlagCommand
          );
          expect(result).toEqual(true);
        });

        it('should return env variable value when no SDK env is set but the feature flag is set', async () => {
          process.env.IS_TRANSLATION_MANAGER_ENABLED = 'false';

          const getIsTranslationManagerEnabled =
            new GetIsTranslationManagerEnabled(new FeatureFlagsService());

          const result = await getIsTranslationManagerEnabled.execute(
            featureFlagCommand
          );
          expect(result).toEqual(false);
        });
      });
    });

    describe('SDK key environment variable is set', () => {
      beforeEach(async () => {
        process.env.LAUNCH_DARKLY_SDK_KEY = originalLaunchDarklySdkKey;

        featureFlagCommand = FeatureFlagCommand.create({
          environmentId: 'environmentId',
          organizationId: 'organizationId',
          userId: 'userId',
        });
      });

      describe('IS_TEMPLATE_STORE_ENABLED', () => {
        it(`should get the feature flag value stored in Launch Darkly (enabled)
           when the SDK key env variable is set regardless of the feature flag set`, async () => {
          process.env.IS_TEMPLATE_STORE_ENABLED = 'false';

          const getIsTemplateStoreEnabled = new GetIsTemplateStoreEnabled(
            new FeatureFlagsService()
          );

          const result = await getIsTemplateStoreEnabled.execute(
            featureFlagCommand
          );
          expect(result).toEqual(true);
        });
      });

      describe('IS_TOPIC_NOTIFICATION_ENABLED', () => {
        it(`should get the feature flag value stored in Launch Darkly (enabled)
           when the SDK key env variable is set regardless of the feature flag set`, async () => {
          process.env.FF_IS_TOPIC_NOTIFICATION_ENABLED = 'false';

          const getIsTopicNotificationEnabled =
            new GetIsTopicNotificationEnabled(new FeatureFlagsService());

          const result = await getIsTopicNotificationEnabled.execute(
            featureFlagCommand
          );
          expect(result).toEqual(true);
        });
      });

      describe('IS_TRANSLATION_MANAGER_ENABLED', () => {
        it(`should get the feature flag value stored in Launch Darkly (enabled)
           when the SDK key env variable is set regardless of the feature flag set`, async () => {
          process.env.IS_TRANSLATION_MANAGER_ENABLED = 'false';

          const getIsTranslationManagerEnabled =
            new GetIsTranslationManagerEnabled(new FeatureFlagsService());

          const result = await getIsTranslationManagerEnabled.execute(
            featureFlagCommand
          );
          expect(result).toEqual(true);
        });
      });
    });
  });
});
