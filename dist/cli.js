#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const main_1 = require("./main");
const meow_1 = __importDefault(require("meow"));
const helpers_1 = require("./helpers");
const chalk_1 = __importDefault(require("chalk"));
//// INIT CLI ////
const cli = meow_1.default(`
	Usage
	  $ photo-cleaner <input-folder> <output-folder> [-d] [-c] [-r recent | older]

	Options
      --deletesrc, -d   Delete source after copy / move
      --copy, -c        Copy files from source instead of move
      --duplicates, -r <recent | older> 
        Remove possible existing duplicates in destination folder (and keep the most recent or the older duplicate)
      --help, -h        Show this help message

	Examples
      $ photo-cleaner INPUT OUTPUT -c
        Sort medias stored in INPUT to OUTPUT in copy mode (INPUT folder will be untouched).

      $ photo-cleaner INPUT OUTPUT -c --duplicates recent
        Sort medias stored in INPUT to OUTPUT in copy mode, then inspect OUTPUT 
        to check duplicates (in case of OUTPUT is not empty before sort operation), 
        and keep the most recent one on any conflict.
`, {
    flags: {
        deletesrc: {
            type: "boolean",
            alias: "d"
        },
        copy: {
            type: "boolean",
            alias: "c"
        },
        help: {
            type: "boolean",
            alias: "h"
        },
        duplicates: {
            type: "string",
            alias: "r"
        }
    }
});
if (cli.flags.help) {
    cli.showHelp(0);
}
// Si le flag duplicate est précisé mais que la valeur est mauvaise
if (cli.flags.duplicates && !["older", "recent", "false"].includes(cli.flags.duplicates)) {
    helpers_1.makeError("Invalid value for --duplicates: " + chalk_1.default.underline(cli.flags.duplicates));
    cli.showHelp(0);
}
if (cli.input.length >= 2) {
    main_1.parseFolders(cli.input[0], cli.input[1], cli.flags);
}
else {
    helpers_1.makeError("Missing positional arguments");
    cli.showHelp(0);
}
