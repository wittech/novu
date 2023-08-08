import { ActionIcon, Input as MantineInput } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import styled from '@emotion/styled';

import { Input, Tooltip } from '../../../design-system';
import { Check, Copy } from '../../../design-system/icons';
import { getApiKeys } from '../../../api/environment';
import { inputStyles } from '../../../design-system/config/inputs.styles';
import { useEnvController } from '../../../hooks';
import { Regenerate } from './components/Regenerate';

export const ApiKeysCard = () => {
  const clipboardApiKey = useClipboard({ timeout: 1000 });
  const clipboardEnvironmentIdentifier = useClipboard({ timeout: 1000 });
  const clipboardEnvironmentId = useClipboard({ timeout: 1000 });
  const { data: apiKeys, refetch: refetchApiKeys } = useQuery<{ key: string }[]>(['getApiKeys'], getApiKeys);

  const { environment } = useEnvController();

  const apiKey = apiKeys?.length ? apiKeys[0].key : '';
  const environmentIdentifier = environment?.identifier ? environment.identifier : '';
  const environmentId = environment?._id ? environment._id : '';

  return (
    <>
      <ParamContainer>
        <MantineInput.Wrapper
          label="API Key"
          description="Use this API key to interact with the Novu API"
          styles={inputStyles}
        >
          <Input
            readOnly
            type={'password'}
            rightSection={
              <Tooltip label={clipboardApiKey.copied ? 'Copied!' : 'Copy Key'}>
                <ActionIcon
                  data-test-id={'api-key-copy'}
                  variant="transparent"
                  onClick={() => clipboardApiKey.copy(apiKey)}
                >
                  {clipboardApiKey.copied ? <Check /> : <Copy />}
                </ActionIcon>
              </Tooltip>
            }
            value={apiKey}
            data-test-id="api-key-container"
          />
        </MantineInput.Wrapper>
        <Regenerate fetchApiKeys={refetchApiKeys} />
      </ParamContainer>
      <ParamContainer>
        <MantineInput.Wrapper
          label="Application Identifier"
          description="A public key identifier that can be exposed to the client applications"
          styles={inputStyles}
        >
          <Input
            readOnly
            rightSection={
              <Tooltip label={clipboardEnvironmentIdentifier.copied ? 'Copied!' : 'Copy Key'}>
                <ActionIcon
                  variant="transparent"
                  data-test-id={'application-identifier-copy'}
                  onClick={() => clipboardEnvironmentIdentifier.copy(environmentIdentifier)}
                >
                  {clipboardEnvironmentIdentifier.copied ? <Check /> : <Copy />}
                </ActionIcon>
              </Tooltip>
            }
            value={environmentIdentifier}
            data-test-id="api-identifier"
          />
        </MantineInput.Wrapper>
      </ParamContainer>
      <ParamContainer>
        <MantineInput.Wrapper label="Environment ID" styles={inputStyles}>
          <Input
            readOnly
            rightSection={
              <Tooltip label={clipboardEnvironmentId.copied ? 'Copied!' : 'Copy Key'}>
                <ActionIcon
                  variant="transparent"
                  data-test-id={'environment-id-copy'}
                  onClick={() => clipboardEnvironmentId.copy(environmentId)}
                >
                  {clipboardEnvironmentId.copied ? <Check /> : <Copy />}
                </ActionIcon>
              </Tooltip>
            }
            value={environmentId}
            data-test-id="environment-id"
          />
        </MantineInput.Wrapper>
      </ParamContainer>
    </>
  );
};

const ParamContainer = styled.div`
  max-width: 600px;
  padding-bottom: 32px;
`;
