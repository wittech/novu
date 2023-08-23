import { Container } from '@mantine/core';

import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { Tabs } from '../../design-system';
import { ApiKeysCard } from './tabs';
import { useAuthContext } from '../../components/providers/AuthProvider';
import { EmailSettings } from './tabs/EmailSettings';
import { ProductLead } from '../../components/utils/ProductLead';
import { Cloud, SSO as SSOIcon, UserAccess } from '../../design-system/icons';

enum MenuTitleEnum {
  API_KEYS = 'API Keys',
  EMAIL_SETTINGS = 'Email Settings',
  PERMISSIONS = 'Permissions',
  SSO = 'SSO',
  DATA_INTEGRATIONS = 'Data Integrations',
}

const SettingsPageWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <PageContainer title="Settings">
      <PageHeader title="Settings" />
      <Container fluid mt={15} ml={5}>
        {children}
      </Container>
    </PageContainer>
  );
};

export function SettingsPage() {
  const { currentOrganization } = useAuthContext();
  const selfHosted = process.env.REACT_APP_DOCKER_HOSTED_ENV === 'true';

  const menuTabs = [
    {
      value: MenuTitleEnum.API_KEYS,
      content: <ApiKeysCard />,
    },
    {
      value: MenuTitleEnum.EMAIL_SETTINGS,
      content: <EmailSettings />,
    },
    {
      value: MenuTitleEnum.PERMISSIONS,
      content: (
        <ProductLead
          icon={<UserAccess />}
          id="rbac-permissions"
          title="Role-based access control"
          text="Securely manage users' permissions to access system resources."
          closeable={false}
        />
      ),
    },
    {
      value: MenuTitleEnum.SSO,
      content: (
        <ProductLead
          icon={<SSOIcon />}
          id="sso-settings"
          title="Single Sign-On (SSO)"
          text="Simplify user authentication and enhance security."
          closeable={false}
        />
      ),
    },
    {
      value: MenuTitleEnum.DATA_INTEGRATIONS,
      content: (
        <ProductLead
          icon={<Cloud />}
          id="data-integrations-settings"
          title="Data Integrations"
          text="Share data with 3rd party services via Segment and Datadog integrations to monitor analytics."
          closeable={false}
        />
      ),
    },
  ];

  if (selfHosted) {
    return (
      <SettingsPageWrapper>
        <ApiKeysCard />
      </SettingsPageWrapper>
    );
  }

  return (
    <SettingsPageWrapper>
      <Tabs loading={!currentOrganization} menuTabs={menuTabs} defaultValue={MenuTitleEnum.API_KEYS} />
    </SettingsPageWrapper>
  );
}
