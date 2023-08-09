import { useEffect, useMemo, useState } from 'react';
import { Group, Center, Box } from '@mantine/core';
import styled from '@emotion/styled';
import slugify from 'slugify';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useIntercom } from 'react-use-intercom';
import {
  CHANNELS_WITH_PRIMARY,
  EmailProviderIdEnum,
  IConfigCredentials,
  IConstructIntegrationDto,
  ICredentialsDto,
  InAppProviderIdEnum,
  NOVU_PROVIDERS,
  SmsProviderIdEnum,
} from '@novu/shared';

import { Button, colors, Sidebar, Text } from '../../../../design-system';
import { useProviders } from '../../useProviders';
import type { IIntegratedProvider } from '../../types';
import { IntegrationInput } from '../../components/IntegrationInput';
import { useFetchEnvironments } from '../../../../hooks/useFetchEnvironments';
import { useUpdateIntegration } from '../../../../api/hooks/useUpdateIntegration';
import { successMessage } from '../../../../utils/notifications';
import { UpdateIntegrationSidebarHeader } from '../../components/UpdateIntegrationSidebarHeader';
import { SetupWarning } from '../../components/SetupWarning';
import { UpdateIntegrationCommonFields } from '../../components/UpdateIntegrationCommonFields';
import { NovuInAppFrameworks } from '../../components/NovuInAppFrameworks';
import { FrameworkEnum } from '../../../quick-start/consts';
import { When } from '../../../../components/utils/When';
import { SetupTimeline } from '../../../quick-start/components/SetupTimeline';
import { Faq } from '../../../quick-start/components/QuickStartWrapper';
import { NovuInAppFrameworkHeader } from '../../components/NovuInAppFrameworkHeader';
import { NovuInAppSetupWarning } from '../../components/NovuInAppSetupWarning';
import { NovuProviderSidebarContent } from '../../components/multi-provider/NovuProviderSidebarContent';
import { useSelectPrimaryIntegrationModal } from './useSelectPrimaryIntegrationModal';

interface IProviderForm {
  name: string;
  credentials: ICredentialsDto;
  active: boolean;
  identifier: string;
}

enum SidebarStateEnum {
  NORMAL = 'normal',
  EXPANDED = 'expanded',
}

export function UpdateProviderSidebar({
  isOpened,
  integrationId,
  onClose,
}: {
  isOpened: boolean;
  integrationId?: string;
  onClose: () => void;
}) {
  const { update } = useIntercom();
  const { isLoading: areEnvironmentsLoading } = useFetchEnvironments();
  const [selectedProvider, setSelectedProvider] = useState<IIntegratedProvider | null>(null);
  const [sidebarState, setSidebarState] = useState<SidebarStateEnum>(SidebarStateEnum.NORMAL);
  const [framework, setFramework] = useState<FrameworkEnum | null>(null);
  const { providers, isLoading: areProvidersLoading } = useProviders();
  const isNovuInAppProvider = selectedProvider?.providerId === InAppProviderIdEnum.Novu;

  const { openModal: openSelectPrimaryIntegrationModal, SelectPrimaryIntegrationModal } =
    useSelectPrimaryIntegrationModal();

  const { updateIntegration, isLoadingUpdate } = useUpdateIntegration(selectedProvider?.integrationId || '');

  const methods = useForm<IProviderForm>({
    shouldUseNativeValidation: false,
    shouldFocusError: false,
    defaultValues: {
      name: '',
      credentials: {},
      active: false,
      identifier: '',
    },
  });
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty, dirtyFields },
  } = methods;

  const credentials = watch('credentials');
  const isActive = watch('active');
  const isSidebarOpened = !!selectedProvider && isOpened;

  const haveAllCredentials = useMemo(() => {
    if (selectedProvider === null) {
      return false;
    }
    const missingCredentials = selectedProvider.credentials
      .filter((credential) => credential.required)
      .filter((credential) => {
        const value = credentials[credential.key];

        return !value;
      });

    return missingCredentials.length === 0;
  }, [selectedProvider, credentials]);

  useEffect(() => {
    if (selectedProvider && !selectedProvider?.identifier) {
      const newIdentifier = slugify(selectedProvider?.displayName, {
        lower: true,
        strict: true,
      });

      setValue('identifier', newIdentifier);
    }
  }, [selectedProvider]);

  useEffect(() => {
    if (integrationId === undefined || providers.length === 0) {
      return;
    }
    const foundProvider = providers.find((provider) => provider.integrationId === integrationId);
    if (!foundProvider) {
      return;
    }

    setSelectedProvider(foundProvider);
    reset({
      name: foundProvider.name ?? foundProvider.displayName,
      identifier: foundProvider.identifier,
      credentials: foundProvider.credentials.reduce((prev, credential) => {
        prev[credential.key] = credential.value;

        return prev;
      }, {} as any),
      active: foundProvider.active,
    });
  }, [integrationId, providers]);

  const onFrameworkClickCallback = (newFramework: FrameworkEnum) => {
    setSidebarState(SidebarStateEnum.EXPANDED);
    setFramework(newFramework);
  };

  const onBack = () => {
    if (sidebarState === SidebarStateEnum.EXPANDED) {
      setSidebarState(SidebarStateEnum.NORMAL);
      setFramework(null);
    }
  };

  const onSidebarClose = () => {
    if (sidebarState === SidebarStateEnum.EXPANDED) {
      setSidebarState(SidebarStateEnum.NORMAL);
    }
    onClose();
    update({ hideDefaultLauncher: false });
  };

  const updateAndSelectPrimaryIntegration = async (data: IConstructIntegrationDto) => {
    if (!selectedProvider) {
      return;
    }

    const { channel: selectedChannel, environmentId, primary } = selectedProvider;
    const isActiveFieldChanged = dirtyFields.active;
    const hasSameChannelActiveIntegration = !!providers
      .filter((el) => !NOVU_PROVIDERS.includes(el.providerId) && el.integrationId !== selectedProvider.integrationId)
      .find((el) => el.active && el.channel === selectedChannel && el.environmentId === environmentId);
    const isChannelSupportPrimary = CHANNELS_WITH_PRIMARY.includes(selectedChannel);

    if (
      isActiveFieldChanged &&
      isChannelSupportPrimary &&
      ((isActive && hasSameChannelActiveIntegration) || (!isActive && primary && hasSameChannelActiveIntegration))
    ) {
      openSelectPrimaryIntegrationModal({
        environmentId: selectedProvider?.environmentId,
        channelType: selectedProvider?.channel,
        exclude: !isActive ? [selectedProvider.integrationId] : undefined,
        onClose: () => {
          updateIntegration(data);
        },
      });

      return;
    }

    updateIntegration(data);
  };

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.stopPropagation();
    e.preventDefault();

    handleSubmit(updateAndSelectPrimaryIntegration)(e);
  };

  if (
    SmsProviderIdEnum.Novu === selectedProvider?.providerId ||
    EmailProviderIdEnum.Novu === selectedProvider?.providerId
  ) {
    return (
      <FormProvider {...methods}>
        <Sidebar
          isOpened={isSidebarOpened}
          isLoading={areProvidersLoading || areEnvironmentsLoading}
          onClose={onSidebarClose}
          onSubmit={onSubmit}
          customHeader={
            <UpdateIntegrationSidebarHeader provider={selectedProvider} onSuccessDelete={onSidebarClose}>
              <Free>Test Provider</Free>
            </UpdateIntegrationSidebarHeader>
          }
          data-test-id="update-provider-sidebar-novu"
          customFooter={
            <Group position="right" w="100%">
              <Button
                disabled={!isDirty || isLoadingUpdate}
                submit
                loading={isLoadingUpdate}
                data-test-id="update-provider-sidebar-update"
              >
                Update
              </Button>
            </Group>
          }
        >
          <NovuProviderSidebarContent provider={selectedProvider} />
          <UpdateIntegrationCommonFields provider={selectedProvider} showActive={false} />
        </Sidebar>
      </FormProvider>
    );
  }

  return (
    <FormProvider {...methods}>
      <Sidebar
        isOpened={isSidebarOpened}
        isLoading={areProvidersLoading || areEnvironmentsLoading}
        isExpanded={sidebarState === SidebarStateEnum.EXPANDED}
        onSubmit={onSubmit}
        onClose={onSidebarClose}
        onBack={onBack}
        customHeader={
          sidebarState === SidebarStateEnum.NORMAL ? (
            <UpdateIntegrationSidebarHeader provider={selectedProvider} onSuccessDelete={onSidebarClose} />
          ) : (
            <>
              <When truthy={isNovuInAppProvider}>
                <NovuInAppFrameworkHeader framework={framework} />
              </When>
            </>
          )
        }
        customFooter={
          <Group position="apart" w="100%">
            <Center inline>
              <Text mr={5}>Explore our</Text>
              <Text gradient>
                <a href={selectedProvider?.docReference} target="_blank" rel="noopener noreferrer">
                  set-up guide
                </a>
              </Text>
            </Center>
            <Button
              disabled={!isDirty || isLoadingUpdate}
              submit
              loading={isLoadingUpdate}
              data-test-id="update-provider-sidebar-update"
            >
              Update
            </Button>
          </Group>
        }
        data-test-id="update-provider-sidebar"
      >
        <When truthy={sidebarState === SidebarStateEnum.NORMAL}>
          <SetupWarning
            show={!haveAllCredentials}
            message="Set up credentials to start sending notifications."
            docReference={selectedProvider?.docReference}
          />
          {isNovuInAppProvider && <NovuInAppSetupWarning provider={selectedProvider} />}
          <UpdateIntegrationCommonFields provider={selectedProvider} />
          {selectedProvider?.credentials.map((credential: IConfigCredentials) => (
            <InputWrapper key={credential.key}>
              <Controller
                name={`credentials.${credential.key}`}
                control={control}
                defaultValue={credential.type === 'boolean' || credential.type === 'switch' ? false : ''}
                rules={{
                  required: credential.required ? `Please enter a ${credential.displayName.toLowerCase()}` : undefined,
                }}
                render={({ field }) => (
                  <IntegrationInput credential={credential} errors={errors?.credentials ?? {}} field={field} />
                )}
              />
            </InputWrapper>
          ))}
          {isNovuInAppProvider && <NovuInAppFrameworks onFrameworkClick={onFrameworkClickCallback} />}
        </When>
        <When truthy={isNovuInAppProvider && sidebarState === SidebarStateEnum.EXPANDED}>
          <SetupTimeline
            framework={framework?.toString() ?? ''}
            onDone={() => {
              setSidebarState(SidebarStateEnum.NORMAL);
              successMessage('Successfully configured Novu In-App');
            }}
            onConfigureLater={() => {
              setSidebarState(SidebarStateEnum.NORMAL);
            }}
          />
          <Box ml={70}>
            <Faq />
          </Box>
        </When>
      </Sidebar>
      <SelectPrimaryIntegrationModal />
    </FormProvider>
  );
}

const InputWrapper = styled.div`
  > div {
    width: 100%;
  }
`;

const Free = styled.span`
  color: ${colors.success};
  font-size: 14px;
  min-width: fit-content;
  margin-left: -4px;
`;
