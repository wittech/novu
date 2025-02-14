import { IntegrationEntity } from '@novu/dal';
import { ISmsFactory, ISmsHandler } from './interfaces';
import {
  AliyunSmsHandler,
  AliyunVmsHandler,
  TwilioHandler,
  /*
   * SnsHandler,
   * TelnyxHandler,
   * Sms77Handler,
   * TermiiSmsHandler,
   * PlivoHandler,
   * GupshupSmsHandler,
   * FiretextSmsHandler,
   * InfobipSmsHandler,
   * BurstSmsHandler,
   * ClickatellHandler,
   * FortySixElksHandler,
   * KannelSmsHandler,
   * MaqsamHandler,
   * SmsCentralHandler,
   * AfricasTalkingSmsHandler,
   * SendchampSmsHandler,
   * ClicksendSmsHandler,
   * SimpletextingSmsHandler,
   * BandwidthHandler,
   */
  GenericSmsHandler,
  // MessageBirdHandler,
  AzureSmsHandler,
  NovuSmsHandler,
  // NexmoHandler,
  HongyanSmsHandler,
} from './handlers';

export class SmsFactory implements ISmsFactory {
  handlers: ISmsHandler[] = [
    new AliyunSmsHandler(),
    new AliyunVmsHandler(),
    new TwilioHandler(),
    /*
     * new SnsHandler(),
     * new TelnyxHandler(),
     * new Sms77Handler(),
     * new TermiiSmsHandler(),
     * new PlivoHandler(),
     * new ClickatellHandler(),
     * new GupshupSmsHandler(),
     * new FiretextSmsHandler(),
     * new InfobipSmsHandler(),
     * new BurstSmsHandler(),
     * new FortySixElksHandler(),
     * new KannelSmsHandler(),
     * new MaqsamHandler(),
     * new SmsCentralHandler(),
     * new AfricasTalkingSmsHandler(),
     * new SendchampSmsHandler(),
     * new ClicksendSmsHandler(),
     * new SimpletextingSmsHandler(),
     * new BandwidthHandler(),
     */
    new GenericSmsHandler(),
    // new MessageBirdHandler(),
    new AzureSmsHandler(),
    new NovuSmsHandler(),
    // new NexmoHandler(),
    new HongyanSmsHandler(),
  ];

  getHandler(integration: IntegrationEntity) {
    const handler =
      this.handlers.find((handlerItem) =>
        handlerItem.canHandle(integration.providerId, integration.channel)
      ) ?? null;

    if (!handler) return null;

    handler.buildProvider(integration.credentials);

    return handler;
  }
}
