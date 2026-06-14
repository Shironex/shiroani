import { processorMustExtendTracedWorkerHostRule } from '../../src/rules/processor-must-extend-traced-worker-host';
import { ruleTester } from '../test-utils/ruleTester';

ruleTester.run(
  'processor-must-extend-traced-worker-host',
  processorMustExtendTracedWorkerHostRule,
  {
    valid: [
      // Decorated processor extending the traced host (literal name).
      {
        code: `@Processor('email-delivery') class EmailDeliveryProcessor extends TracedWorkerHost {}`,
      },
      // Constant name + options object.
      {
        code: `@Processor(QUEUE_NAMES.EMAIL_DELIVERY, { concurrency: 5 }) class P extends TracedWorkerHost {}`,
      },
      // Generic base class still counts.
      {
        code: `@Processor('q') class P extends TracedWorkerHost<MyWorker> {}`,
      },
      // No @Processor decorator -> rule does not apply, even on bare WorkerHost.
      {
        code: `class Helper extends WorkerHost {}`,
      },
      // A different decorator -> not a processor.
      {
        code: `@Injectable() class Svc {}`,
      },
    ],
    invalid: [
      // Extends the bare WorkerHost.
      {
        code: `@Processor('q') class P extends WorkerHost {}`,
        errors: [{ messageId: 'mustExtend' }],
      },
      // Extends nothing.
      {
        code: `@Processor('q') class P {}`,
        errors: [{ messageId: 'mustExtend' }],
      },
    ],
  }
);
