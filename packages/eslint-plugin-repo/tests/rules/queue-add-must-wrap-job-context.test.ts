import { queueAddMustWrapJobContextRule } from '../../src/rules/queue-add-must-wrap-job-context';
import { ruleTester } from '../test-utils/ruleTester';

ruleTester.run('queue-add-must-wrap-job-context', queueAddMustWrapJobContextRule, {
  valid: [
    // Wrapped on a `this.queue` receiver.
    {
      code: `this.queue.add(JOB_NAMES.SEND_WELCOME, withJobContext({ to }));`,
    },
    // Wrapped on a bare queue-ish identifier, with options.
    {
      code: `emailQueue.add(JOB_NAMES.SEND_WELCOME, withJobContext(data), { jobId });`,
    },
    // No data argument -> nothing to wrap.
    {
      code: `this.queue.add(JOB_NAMES.X);`,
    },
    // Not a queue receiver: Set.add / repo.add are untouched.
    {
      code: `seen.add(value);`,
    },
    {
      code: `this.repository.add(a, b);`,
    },
  ],
  invalid: [
    // Raw object data on a queue receiver.
    {
      code: `this.queue.add(JOB_NAMES.SEND_WELCOME, { to });`,
      errors: [{ messageId: 'mustWrap' }],
    },
    // Unwrapped identifier data on a queue-ish identifier.
    {
      code: `emailQueue.add(JOB_NAMES.SEND_WELCOME, data);`,
      errors: [{ messageId: 'mustWrap' }],
    },
  ],
});
