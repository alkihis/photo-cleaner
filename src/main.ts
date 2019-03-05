import fs from 'fs';
import glob from 'glob';
import md5File from 'md5-file';
import ProgressBar from 'progress';
import { deleteFolderRecursive, MediaFiles, registerFile, getTextualMonth, moveFile, getHexCode, FileType, Extensions, initExts, sleep, copyFile, DuplicateMode } from './helpers';
import { removeDuplicates } from './duplicates';

export async function parseFolders(src: string, dest: string, flags: any) {
    // Saute une ligne
    console.log("");

    // Parsage des arguments
    let delete_after = false;
    let copy_mode = false;
    let rm_duplications: DuplicateMode = "false";

    if (flags.copy) {
        copy_mode = true;
    }

    if (flags.deletesrc) {
        delete_after = true;
    }

    if (flags.duplicates) {
        rm_duplications = flags.duplicates;
    }

    if (!fs.existsSync(src)) {
        console.error("Source folder must exists.\n");
        process.exit();
    }

    if (!fs.existsSync(dest)) {
        console.log("Auto-creating destination folder.\n");
        fs.mkdirSync(dest);

        if (!fs.existsSync(dest)) {
            console.error("Unable to create destination folder. Please check your rights.\n");
            process.exit();
        }
    }

    const files: MediaFiles = {};

    const exts: Extensions = initExts();

    // Recherche de tous les fichiers image: .jpg, .jpeg, .png et tous les fichiers vidéo: mp4, avi, mov
    console.log("Looking for media files...");

    const all_files: [string, string][] = [];

    for (const e in exts) {
        for (const ext of exts[e as FileType]) {
            for (const file of glob.sync(src + "/**/*." + ext)) {
                all_files.push([file, e]);
            }
        }
    }

    const first_bar = new ProgressBar(':current/:total computed [:bar] :percent', { total: all_files.length, incomplete: ".", head: ">", clear: true });

    for (const f of all_files) {
        // On peut afficher une barre de progression ici
        await registerFile(files, f[0], f[1] as FileType);
        first_bar.tick();
    }

    first_bar.terminate();

    // Copie ou déplacement vers la destination
    const count_file = Object.keys(files).length;
    console.log(`${count_file === 0 ? "No" : count_file} unique file${count_file > 1 ? "s" : ''} found.\n`);

    if (count_file === 0) {
        process.exit();
    }

    launchCopy(src, dest, delete_after, copy_mode, files, count_file, rm_duplications);
}

export async function launchCopy(src: string, dest: string, delete_after: boolean, copy_mode: boolean, files: MediaFiles, count_file: number, remove_duplicates: DuplicateMode) {
    const bar = new ProgressBar(':current/:total ' + (copy_mode ? "copied" : "moved") + ' [:bar] :percent :etas', { total: count_file, incomplete: ".", head: ">", clear: true });

    const promises: Promise<void>[] = [];

    for (const hash in files) {
        const file = files[hash];
    
        const year = file.mtime.getFullYear();
        const month = getTextualMonth(file.mtime.getMonth() + 1);
    
        const folder = dest + "/" + year + "/" + month + (file.type === FileType.video ? "/Vidéos" : "");
    
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }
    
        if (fs.existsSync(folder + "/" + file.baseName)) {
            const md5 = md5File.sync(folder + "/" + file.baseName);
    
            if (md5 !== hash) {
                let newbasename: string = "";
    
                while (!newbasename) {
                    // C'est pas le même fichier !
                    // On modifie le nom du fichier
                    const newfn = file.fullName.split('.');
                    newfn[newfn.length - 2] += getHexCode();
                    const newfilename = newfn.join('.');
                    newbasename = newfilename.split('/').pop() as string;
    
                    if (fs.existsSync(folder + "/" + newbasename)) {
                        newbasename = "";
                    }
                    else {
                        file.baseName = newbasename;
                    }
                }
            }
            else {
                // Sinon, pas de copie !
                bar.tick();
                continue;
            }
        }
    
        // C'est safe ! On copie
        if (copy_mode) {
            promises.push(copyFile(file.fullName, folder + "/" + file.baseName).then(() => { bar.tick(); }));
        }
        else {
            promises.push(moveFile(file.fullName, folder + "/" + file.baseName).then(() => { bar.tick(); }));
        }
    }
    
    try {
        await Promise.all(promises);
        bar.terminate();

        if (delete_after) {
            console.log("Delete files in source folder.\n");

            deleteFolderRecursive(src, false);
        }

        if (remove_duplicates !== "false") {
            removeDuplicates(dest, remove_duplicates);
        }

        console.log("Your media files has been successfully " + (copy_mode ? "copied" : "moved") + ".\n");
    } catch (err) {
        bar.terminate();
        console.error("An error occured during copy operations.\n", err);
    }
}
