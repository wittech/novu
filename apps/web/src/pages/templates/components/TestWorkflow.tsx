import { useMemo, useEffect, useState } from 'react';
import { Group, JsonInput, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import { IUserEntity, INotificationTriggerVariable } from '@novu/shared';
import { Button, colors } from '../../../design-system';
import { inputStyles } from '../../../design-system/config/inputs.styles';
import { errorMessage, successMessage } from '../../../utils/notifications';
import { useAuthContext } from '../../../components/providers/AuthProvider';
import { getSubscriberValue, getPayloadValue } from './TriggerSnippetTabs';
import { testTrigger } from '../../../api/notification-templates';
import { ExecutionDetailsModalWrapper } from './ExecutionDetailsModalWrapper';
import { useDisclosure } from '@mantine/hooks';
import { SubPageWrapper } from './SubPageWrapper';
import { TriggerSegmentControl } from './TriggerSegmentControl';

const makeToValue = (subscriberVariables: INotificationTriggerVariable[], currentUser?: IUserEntity) => {
  const subsVars = getSubscriberValue(
    subscriberVariables,
    (variable) =>
      (currentUser && currentUser[variable.name === 'subscriberId' ? 'id' : variable.name]) || '<REPLACE_WITH_DATA>'
  );

  return JSON.stringify(subsVars, null, 2);
};

const makePayloadValue = (variables: INotificationTriggerVariable[]) => {
  return JSON.stringify(getPayloadValue(variables), null, 2);
};

function subscriberExist(subscriberVariables: INotificationTriggerVariable[]) {
  return subscriberVariables?.some((variable) => variable.name === 'subscriberId');
}

export function TestWorkflow({ trigger }) {
  const [transactionId, setTransactionId] = useState<string>('');
  const { currentUser } = useAuthContext();
  const { mutateAsync: triggerTestEvent, isLoading } = useMutation(testTrigger);
  const [executionModalOpened, { close: closeExecutionModal, open: openExecutionModal }] = useDisclosure(false);

  const subscriberVariables = useMemo(() => {
    if (trigger?.subscriberVariables && subscriberExist(trigger?.subscriberVariables)) {
      return [...(trigger?.subscriberVariables || [])];
    }

    return [{ name: 'subscriberId' }, ...(trigger?.subscriberVariables || [])];
  }, [trigger]);
  const variables = useMemo(() => [...(trigger?.variables || [])], [trigger]);

  const overridesTrigger = '{\n\n}';

  function jsonValidator(value: string) {
    try {
      JSON.parse(value);
    } catch (e) {
      return 'Invalid JSON';
    }
  }

  const form = useForm({
    initialValues: {
      toValue: makeToValue(subscriberVariables, currentUser),
      payloadValue: makePayloadValue(variables) === '{}' ? '{\n\n}' : makePayloadValue(variables),
      overridesValue: overridesTrigger,
    },
    validate: {
      toValue: jsonValidator,
      payloadValue: jsonValidator,
      overridesValue: jsonValidator,
    },
  });

  useEffect(() => {
    form.setValues({ toValue: makeToValue(subscriberVariables, currentUser) });
  }, [subscriberVariables, currentUser]);

  const onTrigger = async ({ toValue, payloadValue, overridesValue }) => {
    const to = JSON.parse(toValue);
    const payload = JSON.parse(payloadValue);
    const overrides = JSON.parse(overridesValue);

    try {
      const response = await triggerTestEvent({
        name: trigger?.identifier,
        to,
        payload: {
          ...payload,
          __source: 'test-workflow',
        },
        overrides,
      });

      setTransactionId(response.transactionId || '');
      successMessage('Template triggered successfully');
      openExecutionModal();
    } catch (e: any) {
      Sentry.captureException(e);
      errorMessage(e.message || 'Un-expected error occurred');
    }
  };

  return (
    <>
      <SubPageWrapper title="Trigger">
        <Text color={colors.B60} mt={-16}>
          Test trigger as if you sent it from your API or implement it by copy/pasting it into the codebase of your
          application.
        </Text>
        <TriggerSegmentControl />

        <JsonInput
          data-test-id="test-trigger-to-param"
          formatOnBlur
          autosize
          styles={inputStyles}
          label="To"
          {...form.getInputProps('toValue')}
          minRows={3}
          validationError="Invalid JSON"
        />
        <JsonInput
          data-test-id="test-trigger-payload-param"
          formatOnBlur
          autosize
          styles={inputStyles}
          label="Payload"
          {...form.getInputProps('payloadValue')}
          minRows={3}
          validationError="Invalid JSON"
        />
        <JsonInput
          data-test-id="test-trigger-overrides-param"
          formatOnBlur
          autosize
          styles={inputStyles}
          label="Overrides (optional)"
          {...form.getInputProps('overridesValue')}
          minRows={3}
          validationError="Invalid JSON"
        />
        <Group position="right" mt={'auto'}>
          <div data-test-id="test-workflow-btn">
            <Button
              sx={{
                width: 'auto',
              }}
              fullWidth={false}
              disabled={!form.isValid()}
              data-test-id="test-trigger-btn"
              inherit
              loading={isLoading}
              onClick={() => {
                onTrigger(form.values);
              }}
            >
              Run Trigger
            </Button>
          </div>
        </Group>
      </SubPageWrapper>
      <ExecutionDetailsModalWrapper
        transactionId={transactionId}
        isOpen={executionModalOpened}
        onClose={closeExecutionModal}
      />
    </>
  );
}
