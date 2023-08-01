import { ActionIcon, Group, Radio, Text } from '@mantine/core';
import { useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { ChannelTypeEnum, ICreateIntegrationBodyDto, providers } from '@novu/shared';

import { Button, colors, NameInput, Sidebar } from '../../../../design-system';
import { ArrowLeft } from '../../../../design-system/icons';
import { inputStyles } from '../../../../design-system/config/inputs.styles';
import { useFetchEnvironments } from '../../../../hooks/useFetchEnvironments';
import { useSegment } from '../../../../components/providers/SegmentProvider';
import { createIntegration } from '../../../../api/integration';
import { IntegrationsStoreModalAnalytics } from '../../constants';
import { errorMessage, successMessage } from '../../../../utils/notifications';
import { QueryKeys } from '../../../../api/query.keys';
import { ProviderImage } from './SelectProviderSidebar';
import { CHANNEL_TYPE_TO_STRING } from '../../../../utils/channels';
import type { IntegrationEntity } from '../../types';

export function CreateProviderInstanceSidebar({
  isOpened,
  providerId,
  channel,
  onClose,
  onGoBack,
  onIntegrationCreated,
}: {
  isOpened: boolean;
  channel?: string;
  providerId?: string;
  onClose: () => void;
  onGoBack: () => void;
  onIntegrationCreated: (id: string) => void;
}) {
  const { environments, isLoading: areEnvironmentsLoading } = useFetchEnvironments();
  const queryClient = useQueryClient();
  const segment = useSegment();

  const provider = useMemo(
    () => providers.find((el) => el.channel === channel && el.id === providerId),
    [channel, providerId]
  );

  const { mutateAsync: createIntegrationApi, isLoading: isLoadingCreate } = useMutation<
    IntegrationEntity,
    { error: string; message: string; statusCode: number },
    ICreateIntegrationBodyDto
  >(createIntegration);

  const { handleSubmit, control, reset } = useForm({
    shouldUseNativeValidation: false,
    defaultValues: {
      name: '',
      environmentId: '',
    },
  });

  const onCreateIntegrationInstance = async (data) => {
    try {
      if (!provider) {
        return;
      }

      const { _id: integrationId } = await createIntegrationApi({
        providerId: provider.id,
        channel: provider.channel,
        name: data.name,
        credentials: {},
        active: provider.channel === ChannelTypeEnum.IN_APP ? true : false,
        check: false,
        _environmentId: data.environmentId,
      });

      segment.track(IntegrationsStoreModalAnalytics.CREATE_INTEGRATION_INSTANCE, {
        providerId: provider.id,
        channel: provider.channel,
        name: data.name,
        environmentId: data.environmentId,
      });
      successMessage('Instance configuration is created');
      onIntegrationCreated(integrationId ?? '');

      queryClient.refetchQueries({
        predicate: ({ queryKey }) =>
          queryKey.includes(QueryKeys.integrationsList) || queryKey.includes(QueryKeys.activeIntegrations),
      });
    } catch (e: any) {
      errorMessage(e.message || 'Unexpected error');
    }
  };

  useEffect(() => {
    if (!environments?.length) {
      return;
    }

    reset({
      name: provider?.displayName ?? '',
      environmentId: environments.find((env) => env.name === 'Development')?._id || '',
    });
  }, [environments, provider]);

  if (!provider) {
    return null;
  }

  return (
    <Sidebar
      isOpened={isOpened}
      isLoading={areEnvironmentsLoading}
      onSubmit={(e) => {
        handleSubmit(onCreateIntegrationInstance)(e);
        e.stopPropagation();
      }}
      onClose={onClose}
      customHeader={
        <Group spacing={12} w="100%" h={40}>
          <ActionIcon onClick={onGoBack} variant={'transparent'} data-test-id="create-provider-instance-sidebar-back">
            <ArrowLeft color={colors.B80} />
          </ActionIcon>
          <ProviderImage providerId={provider?.id ?? ''} />
          <Controller
            control={control}
            name="name"
            defaultValue=""
            render={({ field }) => {
              return (
                <NameInput
                  {...field}
                  value={field.value !== undefined ? field.value : provider.displayName}
                  data-test-id="provider-instance-name"
                  placeholder="Enter instance name"
                  ml={-10}
                />
              );
            }}
          />
        </Group>
      }
      customFooter={
        <Group ml="auto">
          <Button variant="outline" onClick={onClose} data-test-id="create-provider-instance-sidebar-cancel">
            Cancel
          </Button>
          <Button
            disabled={areEnvironmentsLoading || isLoadingCreate}
            loading={isLoadingCreate}
            submit
            data-test-id="create-provider-instance-sidebar-create"
          >
            Create
          </Button>
        </Group>
      }
      data-test-id="create-provider-instance-sidebar"
    >
      <Text color={colors.B40}>
        Specify assignment preferences to automatically allocate the provider instance to the{' '}
        {CHANNEL_TYPE_TO_STRING[provider.channel]} channel.
      </Text>
      <Controller
        control={control}
        name={'environmentId'}
        defaultValue="Development"
        render={({ field }) => {
          return (
            <Radio.Group
              styles={inputStyles}
              sx={{
                ['.mantine-Group-root']: {
                  paddingTop: 0,
                  paddingLeft: '10px',
                },
              }}
              label="Environment"
              description="Provider instance executes only for"
              spacing={26}
              {...field}
            >
              {environments
                ?.map((environment) => {
                  return { value: environment._id, label: environment.name };
                })
                .map((option) => (
                  <Radio
                    styles={() => ({
                      radio: {
                        backgroundColor: 'transparent',
                        borderColor: colors.B60,
                        '&:checked': { borderColor: 'transparent' },
                      },
                      label: {
                        paddingLeft: 10,
                        fontSize: '14px',
                        fontWeight: 400,
                      },
                    })}
                    key={option.value}
                    value={option.value}
                    label={option.label}
                  />
                ))}
            </Radio.Group>
          );
        }}
      />
    </Sidebar>
  );
}
