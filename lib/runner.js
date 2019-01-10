const util = require('util');
const exec = util.promisify(require('child_process').exec);

class Runner {
    static async execute(command, callback) {
        const { stdout, stderr } = await exec(command);
        callback(stdout, stderr);
    }
}

module.exports = Runner;
