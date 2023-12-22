import React, { FC, useMemo } from 'react';
import {
  Box,
  Select as MantineSelect,
  SelectProps,
  MultiSelect as MantineMultiSelect,
  CloseButton,
  InputBaseProps,
  MultiSelectValueProps,
  useMantineTheme,
  SelectItem,
  Loader,
} from '@mantine/core';
import styled from '@emotion/styled';
import { useSelectStyles } from './Select.styles';
import { inputStyles } from '../config/inputs.styles';
import { ArrowDown } from '../icons';
import { colors } from '../config';
import { Text } from '../index';
import { SpacingProps } from '../shared/spacing.props';

interface ISelectProps extends SpacingProps {
  data: (string | { value: string; label?: string } | SelectItem)[];
  value?: string[] | string | null;
  onChange?: (value: string[] | string | null) => void;
  label?: React.ReactNode;
  error?: React.ReactNode;
  itemComponent?: FC<any>;
  valueComponent?: FC<any>;
  placeholder?: string;
  description?: string;
  getCreateLabel?: (query: string) => React.ReactNode;
  onDropdownOpen?: () => void;
  onSearchChange?: (query: string) => void;
  onCreate?: SelectProps['onCreate'];
  searchable?: boolean;
  creatable?: boolean;
  disabled?: boolean;
  required?: boolean;
  loading?: boolean;
  type?: 'multiselect' | 'select';
  filter?: (value: string, item: SelectItem) => boolean;
  allowDeselect?: boolean;
  dataTestId?: string;
  rightSectionWidth?: React.CSSProperties['width'];
  inputProps?: InputBaseProps;
  withinPortal?: boolean;
  limit?: SelectProps['limit'];
  icon?: React.ReactNode;
}

/**
 * Select component
 *
 */
export const Select = React.forwardRef<HTMLInputElement, ISelectProps>(
  (
    {
      data,
      type = 'select',
      value,
      filter,
      searchable = false,
      creatable = false,
      loading = false,
      disabled = false,
      required = false,
      onChange,
      inputProps = {},
      dataTestId,
      withinPortal = false,
      ...props
    }: ISelectProps,
    ref
  ) => {
    const { classes, theme } = useSelectStyles();
    const searchableSelectProps = searchable
      ? {
          searchable,
          nothingFound: 'Nothing Found',
          clearable: true,
        }
      : {};
    const defaultDesign = {
      radius: 'md',
      size: 'md',
      rightSection: <ArrowDown />,
      rightSectionWidth: 50,
      styles: inputStyles,
      classNames: classes,
      ...inputProps,
    } as InputBaseProps;
    const multiselect = type === 'multiselect';

    let filterResults: ((value: string, item: SelectItem) => boolean) | undefined = filter;

    if (creatable && !filter) {
      filterResults = (currentValue, _) => {
        const isEmptyValue = !currentValue;
        const includedInExistingGroups = !!data.find((group) => {
          return (group as SelectItem)?.label?.toLowerCase().includes(currentValue.toLowerCase());
        });
        const showAllOptionsInSelect = isEmptyValue || includedInExistingGroups;

        return showAllOptionsInSelect;
      };
    }

    const loadingProps = useMemo(() => {
      const loadingStyle = { ...inputStyles(theme), ...{ rightSection: { width: '100%' } } };

      return loading
        ? {
            rightSection: <Loader color={colors.B70} size={32} />,
            styles: loadingStyle,
            value: undefined,
            placeholder: '',
            disabled: true,
          }
        : {};
    }, [loading, theme]);

    return (
      <Wrapper style={{ position: 'relative' }}>
        {multiselect ? (
          <MantineMultiSelect
            ref={ref}
            onChange={onChange}
            autoComplete="nope"
            value={value as string[] | undefined}
            {...defaultDesign}
            {...searchableSelectProps}
            creatable={creatable}
            data={data}
            disabled={disabled}
            required={required}
            valueComponent={Value}
            data-test-id={dataTestId}
            {...props}
            {...loadingProps}
          />
        ) : (
          <MantineSelect
            ref={ref}
            value={value as string | undefined}
            autoComplete="nope"
            {...defaultDesign}
            {...searchableSelectProps}
            creatable={creatable}
            disabled={disabled}
            filter={filterResults}
            onChange={onChange}
            data={data}
            required={required}
            data-test-id={dataTestId}
            withinPortal={withinPortal}
            {...props}
            {...loadingProps}
          />
        )}
      </Wrapper>
    );
  }
);

function Value({ label, onRemove }: MultiSelectValueProps) {
  const theme = useMantineTheme();
  const dark = theme.colorScheme === 'dark';
  const backgroundColor = dark ? theme.colors.dark[4] : theme.colors.gray[0];
  const color = dark ? theme.colors.dark[3] : theme.colors.gray[5];

  return (
    <Box
      sx={{
        alignItems: 'center',
        display: 'flex',
        borderRadius: '5px',
        backgroundColor,
        margin: '5px',
      }}
    >
      <div
        style={{
          margin: '6.5px 0px 6.5px 10px',
          lineHeight: '20px',
          maxWidth: '80px',
          fontSize: 14,
          fontWeight: 400,
        }}
      >
        <Text rows={1}>{label}</Text>
      </div>
      <CloseButton style={{ color }} onMouseDown={onRemove} variant="transparent" size={30} iconSize={15} />
    </Box>
  );
}

const Wrapper = styled.div`
  .mantine-MultiSelect-values {
    min-height: 48px;
    padding: 0;
  }

  .mantine-MultiSelect-input {
    min-height: 50px;

    input {
      height: 100%;
    }
  }
`;
