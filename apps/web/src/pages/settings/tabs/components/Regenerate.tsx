import { useState } from 'react';
import styled from '@emotion/styled';
import { useMutation } from '@tanstack/react-query';
import { showNotification } from '@mantine/notifications';
import { Group } from '@mantine/core';

import { ConfirmRegenerationModal } from './ConfirmRegenerationModal';
import { Button, Text } from '@novu/design-system';
import { regenerateApiKeys } from '../../../../api/environment';

export const Regenerate = ({ fetchApiKeys }: { fetchApiKeys: () => void }) => {
  const [isModalOpened, setModalIsOpened] = useState(false);

  const { mutateAsync: regenerateApiKeysMutation } = useMutation<
    { key: string }[],
    { error: string; message: string; statusCode: number }
  >(regenerateApiKeys);

  async function handleModal() {
    setModalIsOpened(true);
  }

  function cancelAction() {
    setModalIsOpened(false);
  }

  async function confirmAction() {
    await regenerateApiKeysMutation();
    await fetchApiKeys();
    setModalIsOpened(false);
    showNotification({
      message: `Successfully regenerated API keys!`,
      color: 'green',
    });
  }

  return (
    <>
      <Group position="right">
        <Button
          mb={20}
          mt={10}
          data-test-id="show-regenerate-api-key-modal"
          onClick={() => handleModal()}
          variant={'outline'}
        >
          Regenerate API Key
        </Button>
      </Group>
      <ConfirmRegenerationModal isOpen={isModalOpened} cancelAction={cancelAction} confirmAction={confirmAction} />
    </>
  );
};

const Title = styled(Text)`
  padding-bottom: 17px;
  font-size: 20px;
  font-weight: 700;
`;
