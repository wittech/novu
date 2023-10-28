import { Divider, Grid, Group, Modal, useMantineTheme } from '@mantine/core';
import { Controller, useFieldArray, useWatch } from 'react-hook-form';
import { FILTER_TO_LABEL, FilterPartTypeEnum, ChannelTypeEnum, FieldOperatorEnum } from '@novu/shared';

import { When } from '../../../components/utils/When';
import { Button, colors, Input, Select, shadows, Title, Trash } from '@novu/design-system';
import { DeleteStepButton, FilterButton } from './FilterModal.styles';
import { OnlineFiltersForms } from './OnlineFiltersForms';
import { PreviousStepFiltersForm } from './PreviousStepFiltersForm';
import { useMemo } from 'react';

export function FilterModal({
  isOpen,
  cancel,
  confirm,
  control,
  stepIndex,
  setValue,
  readonly,
}: {
  isOpen: boolean;
  cancel: () => void;
  confirm: () => void;
  control: any;
  stepIndex: number;
  setValue: any;
  readonly: boolean;
}) {
  const theme = useMantineTheme();

  const { fields, append, update, remove } = useFieldArray({
    control,
    name: `steps.${stepIndex}.filters.0.children`,
  });

  const { fields: steps } = useFieldArray({
    control,
    name: `steps`,
  });

  const FilterPartTypeList = useMemo(() => {
    const list = [
      { value: FilterPartTypeEnum.PAYLOAD, label: FILTER_TO_LABEL[FilterPartTypeEnum.PAYLOAD] },
      {
        value: FilterPartTypeEnum.SUBSCRIBER,
        label: FILTER_TO_LABEL[FilterPartTypeEnum.SUBSCRIBER],
      },
      { value: FilterPartTypeEnum.WEBHOOK, label: FILTER_TO_LABEL[FilterPartTypeEnum.WEBHOOK] },
      { value: FilterPartTypeEnum.IS_ONLINE, label: FILTER_TO_LABEL[FilterPartTypeEnum.IS_ONLINE] },
      {
        value: FilterPartTypeEnum.IS_ONLINE_IN_LAST,
        label: FILTER_TO_LABEL[FilterPartTypeEnum.IS_ONLINE_IN_LAST],
      },
    ];

    if (steps.length < 2) {
      return list;
    }

    const stepsBeforeSelectedStep = steps.slice(0, stepIndex);
    const selectableSteps = stepsBeforeSelectedStep.filter((step: any) => {
      return [ChannelTypeEnum.EMAIL, ChannelTypeEnum.IN_APP].includes(step.template.type);
    });

    if (selectableSteps.length === 0) {
      return list;
    }

    list.push({
      value: FilterPartTypeEnum.PREVIOUS_STEP,
      label: FILTER_TO_LABEL[FilterPartTypeEnum.PREVIOUS_STEP],
    });

    return list;
  }, [steps, stepIndex]);

  function handleOnChildOnChange(index: number) {
    return (data) => {
      const { id: _, ...rest } = fields[index];
      update(index, { ...rest, on: data });
    };
  }

  return (
    <Modal
      opened={isOpen}
      overlayColor={theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
      overlayOpacity={0.7}
      styles={{
        modal: {
          backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
        },
        body: {
          paddingTop: '5px',
        },
        inner: {
          paddingTop: '180px',
        },
      }}
      title={<Title size={2}>Add filter</Title>}
      sx={{ backdropFilter: 'blur(10px)' }}
      shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
      radius="md"
      size="xl"
      onClose={() => {
        cancel();
      }}
    >
      <Grid align="center">
        <Grid.Col span={3}>
          <Controller
            control={control}
            name={`steps.${stepIndex}.filters.0.value`}
            defaultValue=""
            render={({ field }) => {
              return (
                <Select
                  placeholder="How to group rules?"
                  data={[
                    { value: 'AND', label: 'And' },
                    { value: 'OR', label: 'Or' },
                  ]}
                  {...field}
                  data-test-id="group-rules-dropdown"
                  disabled={readonly}
                />
              );
            }}
          />
        </Grid.Col>
        <Grid.Col span={7} />
        <Grid.Col span={2}>
          <FilterButton
            variant="outline"
            size="md"
            mt={30}
            onClick={() => {
              append({
                operator: FieldOperatorEnum.EQUAL,
                on: 'payload',
              });
            }}
            data-test-id="create-rule-btn"
            disabled={readonly}
          >
            Create rule
          </FilterButton>
        </Grid.Col>
      </Grid>
      <Divider
        sx={{
          marginTop: '15px',
          marginBottom: '15px',
        }}
      />
      {fields.map((item, index) => {
        const filterFieldOn = (fields[index] as any).on;

        return (
          <div key={index}>
            <Grid columns={10} key={item.id} align="center" gutter="xs">
              <Grid.Col span={3}>
                <Controller
                  control={control}
                  name={`steps.${stepIndex}.filters.0.children.${index}.on`}
                  defaultValue=""
                  render={({ field }) => {
                    return (
                      <Select
                        placeholder="On"
                        data={FilterPartTypeList}
                        {...field}
                        onChange={handleOnChildOnChange(index)}
                        data-test-id="filter-on-dropdown"
                        disabled={readonly}
                      />
                    );
                  }}
                />
              </Grid.Col>

              <When truthy={filterFieldOn === FilterPartTypeEnum.WEBHOOK}>
                <WebHookUrlForm control={control} stepIndex={stepIndex} index={index} readonly={readonly} />
                <EqualityForm
                  fieldOn={filterFieldOn}
                  control={control}
                  stepIndex={stepIndex}
                  index={index}
                  remove={remove}
                  setValue={setValue}
                  readonly={readonly}
                />
              </When>

              <When
                truthy={
                  filterFieldOn === FilterPartTypeEnum.IS_ONLINE ||
                  filterFieldOn === FilterPartTypeEnum.IS_ONLINE_IN_LAST
                }
              >
                <OnlineFiltersForms
                  fieldOn={filterFieldOn}
                  control={control}
                  stepIndex={stepIndex}
                  index={index}
                  remove={remove}
                  readonly={readonly}
                />
              </When>
              <When
                truthy={filterFieldOn === FilterPartTypeEnum.PAYLOAD || filterFieldOn === FilterPartTypeEnum.SUBSCRIBER}
              >
                <EqualityForm
                  fieldOn={filterFieldOn}
                  control={control}
                  stepIndex={stepIndex}
                  index={index}
                  remove={remove}
                  setValue={setValue}
                  readonly={readonly}
                />
              </When>
              <When truthy={filterFieldOn === FilterPartTypeEnum.PREVIOUS_STEP}>
                <PreviousStepFiltersForm
                  control={control}
                  stepIndex={stepIndex}
                  index={index}
                  remove={remove}
                  readonly={readonly}
                />
              </When>
            </Grid>
            <When truthy={fields.length > index + 1}>
              <Divider style={{ margin: 5 }} />
            </When>
          </div>
        );
      })}
      <div>
        <Group position="right">
          <Button variant="outline" size="md" mt={30} onClick={() => cancel()}>
            Cancel
          </Button>
          <Button mt={30} size="md" onClick={() => confirm()} data-test-id="filter-confirm-btn" disabled={readonly}>
            Add
          </Button>
        </Group>
      </div>
    </Modal>
  );
}

function WebHookUrlForm({
  control,
  stepIndex,
  index,
  readonly,
}: {
  control: any;
  stepIndex: number;
  index: number;
  readonly: boolean;
}) {
  return (
    <>
      <Grid.Col span={6}>
        <Controller
          control={control}
          name={`steps.${stepIndex}.filters.0.children.${index}.webhookUrl`}
          defaultValue=""
          render={({ field, fieldState }) => {
            return (
              <Input
                {...field}
                error={fieldState.error?.message}
                placeholder="Url"
                data-test-id="webhook-filter-url-input"
                disabled={readonly}
              />
            );
          }}
        />
      </Grid.Col>
    </>
  );
}

function EqualityForm({
  fieldOn,
  control,
  stepIndex,
  index,
  remove,
  setValue,
  readonly,
}: {
  fieldOn: string;
  control: any;
  stepIndex: number;
  index: number;
  remove: (index?: number | number[]) => void;
  setValue;
  readonly: boolean;
}) {
  const spaSize = fieldOn === 'webhook' ? 3 : 2;
  const operator = useWatch({
    control,
    name: `steps.${stepIndex}.filters.0.children.${index}.operator`,
  });

  return (
    <>
      <Grid.Col span={spaSize}>
        <Controller
          control={control}
          name={`steps.${stepIndex}.filters.0.children.${index}.field`}
          defaultValue=""
          render={({ field, fieldState }) => {
            return (
              <Input
                {...field}
                error={fieldState.error?.message}
                placeholder="Key"
                data-test-id="filter-key-input"
                disabled={readonly}
              />
            );
          }}
        />
      </Grid.Col>
      <Grid.Col span={spaSize}>
        <Controller
          control={control}
          name={`steps.${stepIndex}.filters.0.children.${index}.operator`}
          defaultValue={FieldOperatorEnum.EQUAL}
          render={({ field }) => {
            return (
              <Select
                placeholder="Operator"
                data={[
                  { value: FieldOperatorEnum.EQUAL, label: 'Equal' },
                  { value: FieldOperatorEnum.NOT_EQUAL, label: 'Not equal' },
                  { value: FieldOperatorEnum.LARGER, label: 'Larger' },
                  { value: FieldOperatorEnum.SMALLER, label: 'Smaller' },
                  { value: FieldOperatorEnum.LARGER_EQUAL, label: 'Larger or equal' },
                  { value: FieldOperatorEnum.SMALLER_EQUAL, label: 'Smaller or equal' },
                  { value: FieldOperatorEnum.IN, label: 'Contains' },
                  { value: FieldOperatorEnum.NOT_IN, label: 'Not contains' },
                  { value: FieldOperatorEnum.IS_DEFINED, label: 'Is Defined' },
                ]}
                {...field}
                data-test-id="filter-operator-dropdown"
                disabled={readonly}
                onChange={(value) => {
                  field.onChange(value);
                  if (value === FieldOperatorEnum.IS_DEFINED) {
                    setValue(`steps.${stepIndex}.filters.0.children.${index}.value`, '');
                  }
                }}
              />
            );
          }}
        />
      </Grid.Col>

      <Grid.Col span={spaSize}>
        {operator !== FieldOperatorEnum.IS_DEFINED && (
          <Controller
            control={control}
            name={`steps.${stepIndex}.filters.0.children.${index}.value`}
            defaultValue=""
            render={({ field, fieldState }) => {
              return (
                <Input
                  {...field}
                  error={fieldState.error?.message}
                  placeholder="Value"
                  data-test-id="filter-value-input"
                  disabled={readonly}
                />
              );
            }}
          />
        )}
      </Grid.Col>
      <Grid.Col span={1}>
        <DeleteStepButton
          variant="outline"
          size="md"
          mt={30}
          onClick={() => {
            remove(index);
          }}
          data-test-id="filter-remove-btn"
          disabled={readonly}
        >
          <Trash />
        </DeleteStepButton>
      </Grid.Col>
    </>
  );
}
