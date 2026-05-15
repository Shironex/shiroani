import path from 'node:path';
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setConcurrency(1);
// staticFile() reads from the monorepo's shared assets/ directory so we
// don't duplicate the README screenshots into this package's public/.
// Remotion CLI runs from the package directory, so cwd is reliable.
Config.setPublicDir(path.resolve(process.cwd(), '../../assets'));
