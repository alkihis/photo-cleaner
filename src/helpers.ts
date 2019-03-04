import fs from 'fs';
import md5File from 'md5-file';

//// @types 

export interface MediaFile {
    fullName: string;
    type: FileType;
    mtime: Date;
    baseName: string;
};

export type MediaFiles = {[hash: string]: MediaFile};

export enum FileType {
    image = "image", video = "video"
};

export type Extensions = {[fileType: string]: string[]};


//// @functions

export function getHexCode() {
    const max = 1 << 24;
    return '#' + (max + Math.floor(Math.random() * max)).toString(16).slice(-6);
}

// Association numéro de mois => nom de dossier
const months = JSON.parse(fs.readFileSync("cfg/month.json", 'utf8'));
export function getTextualMonth(m: number) : string {
    if (String(m) in months) {
        return months[String(m)];
    }
    else {
        return "0 - Unknown";
    }
}

export function registerFile(files: MediaFiles, file: string, type: FileType) : void {
    const basename = file.split('/').pop() as string;
    const md5 = md5File.sync(file);

    if (md5 in files) {
        // on ignore
    }
    else {
        const mtime = fs.lstatSync(file).mtime;
        files[md5] = { fullName: file, type, mtime, baseName: basename };
    }
}

export function copyFile(src: string, dest: string) : Promise<void> {
    return new Promise((resolve, reject) => {
        fs.copyFile(src, dest, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

export function moveFile(src: string, dest: string) : Promise<void> {
    return new Promise((resolve, reject) => {
        fs.rename(src, dest, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

export function deleteFolderRecursive(path: string, remove_root = true) {
    if (fs.existsSync(path)) {

        fs.readdirSync(path).forEach((file, index) => {
            const curPath = path + "/" + file;

            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } 
            else { // delete file
                fs.unlinkSync(curPath);
            }
        });

        if (remove_root)
            fs.rmdirSync(path);
    }
};

export function initExts() : Extensions {
    // Lecture du JSON contenant les extensions supportées
    const json_exts: {[fileType: string]: string[]} = JSON.parse(fs.readFileSync("cfg/ext.json", 'utf8'));
    const exts: Extensions = {};

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

export function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

