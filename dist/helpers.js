"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const md5_file_1 = __importDefault(require("md5-file"));
const exif_1 = __importDefault(require("exif"));
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
let months;
function getTextualMonth(m) {
    if (!months) {
        months = JSON.parse(fs_1.default.readFileSync("cfg/month.json", 'utf8'));
    }
    if (String(m) in months) {
        return months[String(m)];
    }
    else {
        return "0 - Unknown";
    }
}
exports.getTextualMonth = getTextualMonth;
function getExif(path) {
    return new Promise((resolve, reject) => {
        const e = new exif_1.default.ExifImage({
            image: path
        }, (err, data) => {
            if (err)
                reject(err);
            resolve(data);
        });
    });
}
async function registerFile(files, file, type) {
    const basename = file.split('/').pop();
    const md5 = md5_file_1.default.sync(file);
    if (md5 in files) {
        // on ignore
    }
    else {
        let mtime = fs_1.default.lstatSync(file).mtime;
        // On essaie de récupérer l'exif
        try {
            const e = await getExif(file);
            const date = e.exif.DateTimeOriginal;
            if (date) {
                const formatted = date.replace(/([0-9]{4}):([0-9]{2}):([0-9]{2}) ([0-9]{2}):([0-9]{2}):([0-9]{2})/, '$1-$2-$3 $4:$5:$6');
                mtime = new Date(formatted);
            }
        }
        catch (e) { }
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
