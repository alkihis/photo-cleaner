"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const md5_file_1 = __importDefault(require("md5-file"));
;
var FileType;
(function (FileType) {
    FileType["image"] = "image";
    FileType["video"] = "video";
})(FileType = exports.FileType || (exports.FileType = {}));
;
//// @functions
function getHexCode() {
    const max = 1 << 24;
    return '#' + (max + Math.floor(Math.random() * max)).toString(16).slice(-6);
}
exports.getHexCode = getHexCode;
// Association numéro de mois => nom de dossier
const months = JSON.parse(fs_1.default.readFileSync("cfg/month.json", 'utf8'));
function getTextualMonth(m) {
    if (String(m) in months) {
        return months[String(m)];
    }
    else {
        return "0 - Unknown";
    }
}
exports.getTextualMonth = getTextualMonth;
function registerFile(files, file, type) {
    const basename = file.split('/').pop();
    const md5 = md5_file_1.default.sync(file);
    if (md5 in files) {
        // on ignore
    }
    else {
        const mtime = fs_1.default.lstatSync(file).mtime;
        files[md5] = { fullName: file, type, mtime, baseName: basename };
    }
}
exports.registerFile = registerFile;
function copyFile(src, dest) {
    return new Promise((resolve, reject) => {
        fs_1.default.copyFile(src, dest, (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}
exports.copyFile = copyFile;
function moveFile(src, dest) {
    return new Promise((resolve, reject) => {
        fs_1.default.rename(src, dest, (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}
exports.moveFile = moveFile;
function deleteFolderRecursive(path, remove_root = true) {
    if (fs_1.default.existsSync(path)) {
        fs_1.default.readdirSync(path).forEach((file, index) => {
            const curPath = path + "/" + file;
            if (fs_1.default.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            }
            else { // delete file
                fs_1.default.unlinkSync(curPath);
            }
        });
        if (remove_root)
            fs_1.default.rmdirSync(path);
    }
}
exports.deleteFolderRecursive = deleteFolderRecursive;
;
function initExts() {
    // Lecture du JSON contenant les extensions supportées
    const json_exts = JSON.parse(fs_1.default.readFileSync("cfg/ext.json", 'utf8'));
    const exts = {};
    for (const type in json_exts) {
        if (!(type in exts)) {
            exts[type] = [];
        }
        for (const t of json_exts[type]) {
            let str_t = "";
            for (const char of t) {
                if (char.match(/^[a-z]$/ui)) {
                    str_t += `[${char.toLowerCase()}${char.toUpperCase()}]`;
                }
                else {
                    str_t += char;
                }
            }
            exts[type].push(str_t);
        }
    }
    return exts;
}
exports.initExts = initExts;
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
exports.sleep = sleep;
