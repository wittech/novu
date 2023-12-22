import { ApiServiceLevelEnum } from '@novu/shared';

export class OrganizationEntity {
  _id: string;

  name: string;

  logo?: string;

  // TODO: NV-3067 - Remove optional once all organizations have a service level
  apiServiceLevel?: ApiServiceLevelEnum;

  branding: {
    fontFamily?: string;
    fontColor?: string;
    contentBackground?: string;
    logo: string;
    color: string;
    direction?: 'ltr' | 'rtl';
  };

  partnerConfigurations?: IPartnerConfiguration[];
  defaultLocale?: string;
}

export type OrganizationDBModel = OrganizationEntity;

export interface IPartnerConfiguration {
  accessToken: string;
  configurationId: string;
  projectIds?: string[];
  teamId?: string;
  partnerType: PartnerTypeEnum;
}

export enum PartnerTypeEnum {
  VERCEL = 'vercel',
}

export enum DirectionEnum {
  LTR = 'ltr',
  RTL = 'trl',
}
