import { SegmentedControl, useMantineTheme } from '@mantine/core';
import { colors } from '@novu/design-system';
import { ViewEnum } from './email-editor/EmailMessagesCards';

export const EditorPreviewSwitch = ({ view, setView }) => {
  const theme = useMantineTheme();

  return (
    <SegmentedControl
      data-test-id="editor-mode-switch"
      styles={{
        root: {
          background: 'transparent',
          border: `1px solid ${theme.colorScheme === 'dark' ? colors.B40 : colors.B70}`,
          borderRadius: '30px',
          width: '100%',
          maxWidth: '300px',
        },
        label: {
          fontSize: '14px',
          lineHeight: '24px',
        },
        control: {
          minWidth: '80px',
        },
        active: {
          background: theme.colorScheme === 'dark' ? colors.B40 : colors.B98,
          borderRadius: '30px',
        },
        labelActive: {
          color: `${theme.colorScheme === 'dark' ? colors.white : colors.B40} !important`,
          fontSize: '14px',
          lineHeight: '24px',
        },
      }}
      data={Object.values(ViewEnum)}
      value={view}
      onChange={(value) => {
        setView(value);
      }}
      defaultValue={view}
      fullWidth
      radius={'xl'}
    />
  );
};
