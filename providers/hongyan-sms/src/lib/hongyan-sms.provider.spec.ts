import { HongyanSmsProvider } from './hongyan-sms.provider';

test('should trigger hongyan-sms correctly', async () => {
  const provider = new HongyanSmsProvider({
    appKey: '1',
    secretKey: '2',
    endpoint: 'http://127.0.0.1',
  });
  await provider.sendMessage({
    to: '13093857463',
    content: 'Test',
  });
  /*
   * const spy = jest
   *   // eslint-disable-next-line @typescript-eslint/ban-ts-comment
   *   // @ts-expect-error
   *   .spyOn(provider.sms77Client, 'sms')
   *   .mockImplementation(async () => {
   *     return {
   *       messages: [{ id: null }],
   *       // eslint-disable-next-line @typescript-eslint/no-explicit-any
   *     } as any;
   *   });
   */
  /*
   * await provider.sendMessage({
   *   to: '+187654',
   *   content: 'Test',
   * });
   */
  /*
   * expect(spy).toHaveBeenCalled();
   * expect(spy).toHaveBeenCalledWith({
   *   from: '+1145678',
   *   json: true,
   *   text: 'Test',
   *   to: '+187654',
   * });
   */
});
