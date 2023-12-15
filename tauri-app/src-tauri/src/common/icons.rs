
use std::ffi::{c_int, c_void};
use std::path::{Path, PathBuf};
use std::{io, env, fs, ptr};
use std::ffi::{CStr, CString};
use gdk_pixbuf::{Pixbuf, PixbufError};
use gio_sys::GThemedIcon;
use glib::gobject_ffi::{GObject, g_object_unref};
use glib_sys::{g_free, GError, g_error_free};
use gtk_sys::{GTK_ICON_LOOKUP_NO_SVG, GtkIconTheme, gtk_icon_info_get_filename, gtk_icon_theme_get_default, gtk_icon_theme_lookup_icon, gtk_icon_theme_choose_icon, gtk_icon_info_free, gtk_icon_info_load_icon};
use gdk_pixbuf_sys::*;

static mut DEFAULT_THEME: Option<*mut GtkIconTheme> = None;

use dirs;
use ini::{ParseOption, Ini};

pub struct AppInfo {
    pub icon_name: String,
    pub app_name: String,
    pub icon_data: Vec<u8>,
}

/// Returns a vector of application directories that are expected
/// to contain all .desktop files the current user has access to.
fn get_application_directories() -> io::Result<Vec<PathBuf>> {
    let xdg_home = match env::var_os("XDG_DATA_HOME") {
        Some(path) => {
            PathBuf::from(path)
        },
        None => {
            let home = dirs::home_dir()
                .ok_or(io::Error::new(io::ErrorKind::Other, "Failed to get home directory"))?;

            home.join(".local/share")
        }
    };

    let extra_application_dirs = match env::var_os("XDG_DATA_DIRS") {
        Some(paths) => {
            env::split_paths(&paths)
                .map(PathBuf::from)
                .collect()
        },
        None => {
            // Fallback if XDG_DATA_DIRS is not set. If it's set, it normally already contains /usr/share and
            // /usr/local/share
            vec![
                PathBuf::from("/usr/share"),
                PathBuf::from("/usr/local/share"),
            ]
        }
    };

    let mut app_dirs = Vec::new();
    for extra_dir in extra_application_dirs {
        app_dirs.push(extra_dir.join("applications"));
    }

    app_dirs.push(xdg_home.join("applications"));

    Ok(app_dirs)
}


fn find_desktop_files(path: &Path) -> io::Result<Vec<fs::DirEntry>> {
    match path.read_dir() {
        Ok(files) => {
            let desktop_files = files
                .filter_map(|entry| entry.ok())
                .filter(|entry| match entry.file_type() {
                    Ok(ft) => ft.is_file() || ft.is_symlink(),
                    _ => false
                })
                .filter(|entry| entry.file_name().to_string_lossy().ends_with(".desktop"))
                .collect::<Vec<_>>();

            Ok(desktop_files)
        },
        Err(err) => {
            // We ignore NotFound errors here because not all application
            // directories need to exist.
            if err.kind() == io::ErrorKind::NotFound {
                Ok(Vec::new())
            } else {
                Err(err)
            }
        }
    }
}

pub enum CheckType {
    Name,
    Exec,
}

pub fn find_icon(path: &str) -> io::Result<AppInfo> {
    match get_application_icon_name(&path, CheckType::Exec) {
        Ok(result) => {
            println!("found icon by exec path");

            Ok(result)
        },
        Err(err) => {
            if err.kind() != io::ErrorKind::NotFound {
                Err(err)
            } else {
                // Try again but this time match against the Name field
                get_application_icon_name(&path, CheckType::Name)
            }
        }
    }
}

fn get_application_icon_name(executable: &str, check: CheckType) -> io::Result<AppInfo> {
    let path = PathBuf::from(executable);

    let file_name = path
        .as_path()
        .file_name()
        .unwrap()
        .to_str()
        .ok_or(io::Error::new(io::ErrorKind::Other, "failed to get file name"))?;

    for dir in get_application_directories()? {
        let desktop_files = find_desktop_files(dir.as_path())?;
        for file in desktop_files {
            let content = Ini::load_from_file_opt(file.path(), ParseOption{
                    enabled_escape: false,
                    enabled_quote: true
                })
                .map_err(|err| io::Error::new(io::ErrorKind::Other, err.to_string()))?;

            let desktop_section = match content.section(Some("Desktop Entry")) {
                Some(section) => section,
                None => {
                    eprintln!("{} does not contain a [Desktop Entry] section", file.path().to_string_lossy());

                    continue;
                }
            };

            let matches = match check {
                CheckType::Name => {
                    let name = match desktop_section.get("Name") {
                        Some(name) => name,
                        None => {
                            eprintln!("{} does not have a Name key", file.path().to_string_lossy());

                            continue;
                        }
                    };

                    name.to_lowercase().contains(file_name)
                },
                CheckType::Exec => {
                    let exec = match desktop_section.get("Exec") {
                        Some(exec) => exec,
                        None => {
                            eprintln!("{} does not have a Exec key", file.path().to_string_lossy());

                            continue;
                        }
                    };

                    exec.to_lowercase().contains(executable)
                }
            };

            if matches {
                println!("Found matching desktop file at {}", file.path().to_string_lossy());

                let icon_name = match desktop_section.get("Icon") {
                    Some(icon_name) => icon_name,
                    None => {
                        // continue searching the next directory.
                        continue;
                    }
                };

                let mut owned_icon = icon_name.to_owned();
                owned_icon.push_str(".png");

                println!("Trying to find icon {}", owned_icon);

                match get_icon_as_file(icon_name, 64) {
                    Ok(result) => {
                        println!("Found icon {} at path {} (method 1)", icon_name, result.0);

                        return Ok(AppInfo{
                            icon_name: result.0,
                            app_name: "".to_string(),
                            icon_data: result.1,
                        })
                    },
                    Err(err) => {
                        eprintln!("failed to get icon path for icon {}: {}", icon_name, err.to_string());

                        match get_icon_as_file_2(icon_name, 64) {
                            Ok(file_path) => {
                                println!("Found icon {} at path {} (method 2)", icon_name, file_path.0);

                                return Ok(AppInfo{
                                    icon_name: file_path.0,
                                    app_name: "".to_string(),
                                    icon_data: file_path.1,
                                })
                            },
                            Err(err) => {
                                eprintln!("failed to get icon path for icon using method 2 {}: {}", icon_name, err.to_string());
                            }
                        }

                        continue;
                    }
                }
            }
        }

    }

    Err(io::Error::new(io::ErrorKind::NotFound, "no matching .desktop files found"))
}

fn get_icon_as_file(name: &str, size: i8) -> io::Result<(String, Vec<u8>)> {
    let result: String;
    let buf: Vec<u8>;

    unsafe {
        if DEFAULT_THEME.is_none() {
            let theme = gtk_icon_theme_get_default();
            if theme.is_null() {
                println!("You have to initialize GTK!");
                return Err(io::Error::new(io::ErrorKind::Other, "You have to initialize GTK!"))
            }

            let theme = gtk_icon_theme_get_default();
            DEFAULT_THEME = Some(theme);
        }
        let c_str = CString::new(name).unwrap();

        let icon_info = gtk_icon_theme_lookup_icon(DEFAULT_THEME.unwrap(), c_str.as_ptr() as *const i8, size as c_int, 0);
        let filename = gtk_icon_info_get_filename(icon_info);

        if icon_info.is_null() {
            return Err(io::Error::new(io::ErrorKind::NotFound, "icon not found"))
        }

        result = CStr::from_ptr(filename).to_str().unwrap().to_string();

        buf = match read_pixbuf(result.clone()) {
            Ok(pb) => pb,
            Err(_) => Vec::new(),
        };

        gtk_icon_info_free(icon_info);
    }

    Ok((result, buf))
}

fn get_icon_as_file_2(ext: &str, size: i32) -> io::Result<(String, Vec<u8>)> {
    let result: String;
    let buf: Vec<u8>;

    unsafe {
        let filename = CString::new(ext).unwrap();
        let null: u8 = 0;
        let p_null = &null as *const u8;
        let nullsize: usize = 0;
        let mut res = 0;
        let p_res = &mut res as *mut i32;
        let p_res = gio_sys::g_content_type_guess(filename.as_ptr(), p_null, nullsize, p_res);
        let icon = gio_sys::g_content_type_get_icon(p_res);
        g_free(p_res as *mut c_void);
        if DEFAULT_THEME.is_none() {
            let theme = gtk_icon_theme_get_default();
            if theme.is_null() {
                println!("You have to initialize GTK!");
                return Err(io::Error::new(io::ErrorKind::Other, "You have to initialize GTK!"))
            }
            let theme = gtk_icon_theme_get_default();
            DEFAULT_THEME = Some(theme);
        }
        let icon_names = gio_sys::g_themed_icon_get_names(icon as *mut GThemedIcon) as *mut *const i8;
        let icon_info = gtk_icon_theme_choose_icon(DEFAULT_THEME.unwrap(), icon_names, size, GTK_ICON_LOOKUP_NO_SVG);
        let filename = gtk_icon_info_get_filename(icon_info);

        gtk_icon_info_free(icon_info);

        result = CStr::from_ptr(filename).to_str().unwrap().to_string();

        buf = match read_pixbuf(result.clone()) {
            Ok(pb) => pb,
            Err(_) => Vec::new(),
        };

        g_object_unref(icon as *mut GObject);
    }

    Ok((result, buf))

}

fn read_pixbuf(result: String) -> std::result::Result<Vec<u8>, glib::Error> {
        let pixbuf = match Pixbuf::from_file(result.clone()) {
            Ok(data) => Ok(data),
            Err(err) => {
                eprintln!("failed to load icon pixbuf: {}", err.to_string());

                Pixbuf::from_resource(result.clone().as_str())
            }
        };

        if let Ok(data) = pixbuf {
            match data.save_to_bufferv("png", &[]) {
                Ok(data) => {
                    println!("Successfully converted icon to png");

                    return Ok(data)
                },
                Err(err) => {
                    return Err(glib::Error::new(PixbufError::Failed, ""));
                }
            };
        } 

        Err(glib::Error::new(PixbufError::Failed, "failed"))
}

