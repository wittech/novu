import { Flex, Grid, Group, Input, LoadingOverlay, Stack, useMantineTheme } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IOrganizationEntity } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { updateBrandingSettings } from '../../../api/organization';
import { getSignedUrl } from '../../../api/storage';
import Card from '../../../components/layout/components/Card';
import { Button, ColorInput, colors, Select } from '../../../design-system';
import { inputStyles } from '../../../design-system/config/inputs.styles';
import { Upload } from '../../../design-system/icons';
import { successMessage } from '../../../utils/notifications';

const mimeTypes = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
};

export function BrandingForm({
  isLoading,
  organization,
}: {
  isLoading: boolean;
  organization: IOrganizationEntity | undefined;
}) {
  const [image, setImage] = useState<string>();
  const [file, setFile] = useState<File>();
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const { mutateAsync: getSignedUrlAction } = useMutation<
    { signedUrl: string; path: string; additionalHeaders: object },
    { error: string; message: string; statusCode: number },
    string
  >(getSignedUrl);

  const { mutateAsync: updateBrandingSettingsMutation, isLoading: isUpdateBrandingLoading } = useMutation<
    { logo: string; path: string },
    { error: string; message: string; statusCode: number },
    { logo: string | undefined; color: string | undefined }
  >(updateBrandingSettings);

  useEffect(() => {
    if (organization) {
      if (organization.branding?.logo) {
        setImage(organization.branding.logo);
      }
      if (organization.branding?.color) {
        setValue('color', organization?.branding?.color);
      }
      if (organization.branding?.fontFamily) {
        setValue('fontFamily', organization?.branding?.fontFamily);
      }
    }
  }, [organization]);

  function beforeUpload(files: File[]) {
    setFile(files[0]);
  }

  useEffect(() => {
    if (file) {
      handleUpload();
    }
  }, [file]);

  async function handleUpload() {
    if (!file) return;

    setImageLoading(true);
    const { signedUrl, path, additionalHeaders } = await getSignedUrlAction(mimeTypes[file.type]);
    const contentTypeHeaders = {
      'Content-Type': file.type,
    };
    const mergedHeaders = Object.assign({}, contentTypeHeaders, additionalHeaders || {});
    await axios.put(signedUrl, file, {
      headers: mergedHeaders,
      transformRequest: [
        (data, headers) => {
          if (headers) {
            // eslint-disable-next-line
            delete headers.Authorization;
          }

          return data;
        },
      ],
    });

    setImage(path);
    setImageLoading(false);
  }

  async function saveBrandsForm({ color, fontFamily }) {
    const brandData = {
      color,
      logo: image,
      fontFamily,
    };

    await updateBrandingSettingsMutation(brandData);

    successMessage('Branding info updated successfully');
  }

  const { setValue, handleSubmit, control } = useForm({
    defaultValues: {
      fontFamily: organization?.branding?.fontFamily || 'inherit',
      color: organization?.branding?.color || '#f47373',
      image: image || '',
      file: file || '',
    },
  });
  const theme = useMantineTheme();

  return (
    <Stack h="100%">
      <LoadingOverlay visible={isLoading} />
      <form noValidate onSubmit={handleSubmit(saveBrandsForm)}>
        <Grid>
          <Grid.Col span={6}>
            <Card title="Brand Setting" space={26}>
              <Stack spacing={40}>
                <Flex>
                  <Controller
                    render={({ field }) => (
                      <Input.Wrapper
                        styles={inputStyles}
                        label="Your Logo"
                        description="Will be used on email templates and inbox"
                      >
                        <Dropzone
                          styles={{
                            root: {
                              borderRadius: '7px',
                              border: ` 1px solid ${
                                theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[5]
                              }`,
                              background: 'none',
                            },
                          }}
                          accept={Object.keys(mimeTypes)}
                          multiple={false}
                          onDrop={beforeUpload}
                          {...field}
                          data-test-id="upload-image-button"
                        >
                          <Group
                            position="center"
                            spacing="xl"
                            style={{ minHeight: 100, minWidth: 100, pointerEvents: 'none' }}
                          >
                            {!image ? (
                              <Upload style={{ width: 80, height: 80, color: colors.B60 }} />
                            ) : (
                              <img
                                data-test-id="logo-image-wrapper"
                                src={image}
                                style={{ width: 100, height: 100, objectFit: 'contain' }}
                                alt="avatar"
                              />
                            )}
                          </Group>
                        </Dropzone>
                      </Input.Wrapper>
                    )}
                    control={control}
                    name="image"
                  />
                </Flex>
                <div style={{ width: '50%' }}>
                  <Controller
                    render={({ field }) => (
                      <ColorInput
                        label="Font Color"
                        description="Will be used for text in the in-app widget"
                        data-test-id="color-picker"
                        disallowInput={false}
                        {...field}
                      />
                    )}
                    control={control}
                    name="color"
                  />
                </div>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={6}>
            {' '}
            <Card title="In-App Widget Customizations" space={26}>
              <Controller
                render={({ field }) => (
                  <Select
                    label="Font Family"
                    description="Will be used as the main font-family in the in-app widget"
                    placeholder="Select a font family"
                    data={[
                      'inherit',
                      'Fira Code',
                      'Roboto',
                      'Montserrat',
                      'Open Sans',
                      'Lato',
                      'Nunito',
                      'Oswald',
                      'Raleway',
                    ]}
                    data-test-id="font-family-selector"
                    {...field}
                  />
                )}
                control={control}
                name="fontFamily"
              />
            </Card>
          </Grid.Col>
        </Grid>

        <div
          style={{
            textAlign: 'right',
            marginTop: '60px',
          }}
        >
          <Button submit loading={isUpdateBrandingLoading} data-test-id="submit-branding-settings">
            Update
          </Button>
        </div>
      </form>
    </Stack>
  );
}
