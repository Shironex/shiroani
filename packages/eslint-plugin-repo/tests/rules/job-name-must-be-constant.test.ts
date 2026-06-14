import { jobNameMustBeConstantRule } from '../../src/rules/job-name-must-be-constant';
import { ruleTester } from '../test-utils/ruleTester';

ruleTester.run('job-name-must-be-constant', jobNameMustBeConstantRule, {
  valid: [
    // Constant queue name in the decorator.
    {
      code: `@Processor(QUEUE_NAMES.EMAIL_DELIVERY) class P extends TracedWorkerHost {}`,
    },
    // Constant job name in queue.add.
    {
      code: `this.queue.add(JOB_NAMES.SEND_WELCOME, withJobContext(d));`,
    },
    // Plain identifier constant is fine.
    {
      code: `@Processor(EMAIL_DELIVERY_QUEUE_NAME) class P extends TracedWorkerHost {}`,
    },
    // Non-queue .add with a literal first arg is not policed.
    {
      code: `map.add('key', value);`,
    },
  ],
  invalid: [
    // Inline literal queue name in the decorator.
    {
      code: `@Processor('email-delivery') class P extends TracedWorkerHost {}`,
      errors: [{ messageId: 'mustBeConstant' }],
    },
    // Inline literal job name in queue.add.
    {
      code: `this.queue.add('send-welcome', withJobContext(d));`,
      errors: [{ messageId: 'mustBeConstant' }],
    },
  ],
});
