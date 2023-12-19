
use std::collections::HashMap;
use std::ffi::c_int;
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};
use std::{io::{Result, Error, ErrorKind}, env, fs};
use std::ffi::{CStr, CString};
use gdk_pixbuf::{Pixbuf, PixbufError};
use gtk_sys::{GtkIconTheme, gtk_icon_info_get_filename, gtk_icon_theme_get_default, gtk_icon_theme_lookup_icon, gtk_icon_info_free};
use dataurl::DataUrl;
use cached::proc_macro::once;

use dirs;
use ini::{ParseOption, Ini};

static mut GTK_DEFAULT_THEME: Option<*mut GtkIconTheme> = None;

lazy_static! {
    static ref APP_INFO_CACHE: Arc<RwLock<HashMap<String, AppInfo>>> = Arc::new(RwLock::new(HashMap::new()));
}

#[derive(Clone, serde::Serialize)]
pub struct AppInfo {
    pub icon_name: String,
    pub app_name: String,
    pub icon_dataurl: String,
    pub comment: String,
}

impl Default for AppInfo {
    fn default() -> Self {
        AppInfo {
            icon_dataurl: "".to_string(),
            icon_name: "".to_string(),
            app_name: "".to_string(),
            comment: "".to_string(),
        }
    }
}

#[derive(Clone, serde::Serialize, Debug)]
pub struct ProcessInfo {
    pub exec_path: String,
    pub cmdline: String,
    pub pid: i64,
    pub matching_path: String,
}

impl std::fmt::Display for ProcessInfo {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{} (cmdline={}) (pid={}) (matching_path={})", self.exec_path, self.cmdline, self.pid, self.matching_path)
    } 
}

pub fn get_app_info(process_info: ProcessInfo) -> Result<AppInfo> {
    {
        let cache = APP_INFO_CACHE.read()
            .unwrap();

        if let Some(value) = cache.get(process_info.exec_path.as_str()) {
            println!("returning cached app-info for {}", process_info.exec_path.as_str());

            return Ok(value.clone())
        }
    }

    let mut needles = Vec::new();
    if !process_info.exec_path.is_empty() {
        needles.push(process_info.exec_path.as_str())
    }
    if !process_info.cmdline.is_empty() {
        needles.push(process_info.cmdline.as_str())
    }
    if !process_info.matching_path.is_empty() {
        needles.push(process_info.matching_path.as_str())
    }

    #[cfg(debug_assertions)]
    println!("Searching app info for {:?}", process_info);

    let mut info: Option<AppInfo> = None;
    for needle in needles.clone() {
        #[cfg(debug_assertions)]
        println!("Trying needle {} on exec path", needle);

        match try_get_app_info(needle, CheckType::Exec) {
            Ok(result) => {
                info = Some(result);

                break;
            },
            Err(err) => {
                if err.kind() != ErrorKind::NotFound {
                    return Err(err)
                }
            }
        };
    }

    if info.is_none() {
        for needle in needles {
            println!("Trying needle {} on Name", needle);

            match try_get_app_info(needle, CheckType::Name) {
                Ok(result) => {
                    info = Some(result);

                    break;
                },
                Err(err) => {
                    if err.kind() != ErrorKind::NotFound {
                        return Err(err)
                    }
                }
            };
        }
    }

    match info {
        Some(info) => {
            APP_INFO_CACHE.write()
                .unwrap()
                .insert(process_info.exec_path, info.clone());

            Ok(info)
        },
        None => {
            Err(Error::new(ErrorKind::NotFound, format!("failed to find app info")))
        }
    }
}

/// Returns a vector of application directories that are expected
/// to contain all .desktop files the current user has access to.
/// The result of this function is cached for 5 minutes as it's not expected
/// that application directories actually change.
#[once(time=300, sync_writes=true, result = true)]
fn get_application_directories() -> Result<Vec<PathBuf>> {
    let xdg_home = match env::var_os("XDG_DATA_HOME") {
        Some(path) => {
            PathBuf::from(path)
        },
        None => {
            let home = dirs::home_dir()
                .ok_or(Error::new(ErrorKind::Other, "Failed to get home directory"))?;

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


// TODO(ppacher): cache the result of find_desktop_files as well.
// Though, seems like we cannot use the #[cached::proc_macro::cached] or #[cached::proc_macro::once] macros here
// because [`Result<Vec<fs::DirEntry>>>`] does not implement [`Clone`]
fn find_desktop_files(path: &Path) -> Result<Vec<fs::DirEntry>> {
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
            if err.kind() == ErrorKind::NotFound {
                Ok(Vec::new())
            } else {
                Err(err)
            }
        }
    }
}

enum CheckType {
    Name,
    Exec,
}



fn try_get_app_info(needle: &str, check: CheckType) -> Result<AppInfo> {
    let path = PathBuf::from(needle);

    let file_name = path
        .as_path()
        .file_name()
        .unwrap_or_default()
        .to_str();

    for dir in get_application_directories()? {
        let desktop_files = find_desktop_files(dir.as_path())?;
        for file in desktop_files {
            let content = Ini::load_from_file_opt(file.path(), ParseOption{
                    enabled_escape: false,
                    enabled_quote: true
                })
                .map_err(|err| Error::new(ErrorKind::Other, err.to_string()))?;

            let desktop_section = match content.section(Some("Desktop Entry")) {
                Some(section) => section,
                None => {
                    continue;
                }
            };

            let matches = match check {
                CheckType::Name => {
                    let name = match desktop_section.get("Name") {
                        Some(name) => name,
                        None => {
                            continue;
                        }
                    };

                    if let Some(file_name) = file_name {
                        name.to_lowercase().contains(file_name)
                    } else {
                        false
                    }
                },
                CheckType::Exec => {
                    let exec = match desktop_section.get("Exec") {
                        Some(exec) => exec,
                        None => {
                            continue;
                        }
                    };

                    if exec.to_lowercase().contains(needle) {
                        true
                    } else if let Some(file_name) = file_name {
                        exec.to_lowercase().contains(file_name)
                    } else {
                        false
                    }
                }
            };

            if matches {

                println!("Found matching desktop file at {}", file.path().to_string_lossy());

                let mut info = parse_app_info(desktop_section);


                match get_icon_as_png_dataurl(&info.icon_name, 32) {
                    Ok(result) => {
                        println!("Found icon {} at path {} (method 1)", info.icon_name, result.0);

                        info.icon_name = result.0;
                        info.icon_dataurl = result.1;

                        return Ok(info)
                    },
                    Err(err) => {
                        eprintln!("failed to get icon path for icon {}: {}", info.icon_name, err.to_string());

                        /*
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
                        */

                        continue;
                    }
                }
            }
        }

    }

    Err(Error::new(ErrorKind::NotFound, "no matching .desktop files found"))
}

fn parse_app_info(props: &ini::Properties) -> AppInfo {
    AppInfo { 
        icon_dataurl: "".to_string(),
        app_name: props.get("Name").unwrap_or_default().to_string(),
        comment: props.get("Comment").unwrap_or_default().to_string(),
        icon_name: props.get("Icon").unwrap_or_default().to_string(),
    }
}

fn get_icon_as_png_dataurl(name: &str, size: i8) -> Result<(String, String)> {
    unsafe {
        if GTK_DEFAULT_THEME.is_none() {
            let theme = gtk_icon_theme_get_default();
            if theme.is_null() {
                println!("You have to initialize GTK!");
                return Err(Error::new(ErrorKind::Other, "You have to initialize GTK!"))
            }

            let theme = gtk_icon_theme_get_default();
            GTK_DEFAULT_THEME = Some(theme);
        }
    }

    let mut icons = Vec::new();

    // push the name
    icons.push(name);

    // if we don't find the icon by it's name and it includes an extension,
    // drop the extension and try without.
    let name_without_ext;
    if let Some(ext) = PathBuf::from(name).extension() {
        let ext = ext.to_str().unwrap();

        let mut ext_dot = String::from(".").to_owned();
        ext_dot.push_str(ext);

        name_without_ext = name.replace(ext_dot.as_str(), "");
        icons.push(name_without_ext.as_str());
    } else {
        name_without_ext = String::from(name);
    }

    // The xdg-desktop icon specification allows a fallback for icons that contains dashes.
    // i.e. the following lookup order is used:
    //      - network-wired-secure
    //      - network-wired
    //      - network
    //
    name_without_ext.split("-")
        .for_each(|part| icons.push(part));


    for name in icons {
        #[cfg(debug_assertions)]
        println!("trying to load icon {}", name);

        unsafe {
            let c_str = CString::new(name).unwrap();

            let icon_info = gtk_icon_theme_lookup_icon(GTK_DEFAULT_THEME.unwrap(), c_str.as_ptr() as *const i8, size as c_int, 0);
            if icon_info.is_null() {
                eprintln!("failed to lookup icon {}", name);

                continue;
            }

            let filename = gtk_icon_info_get_filename(icon_info);

            let filename  = CStr::from_ptr(filename).to_str().unwrap().to_string();

            gtk_icon_info_free(icon_info);

            match read_and_convert_pixbuf(filename.clone()) {
                Ok(pb) => {
                    return Ok((filename, pb))
                },
                Err(err) => {
                    eprintln!("failed to load icon from {}: {}", filename, err.to_string());

                    continue;
                }
            }
        }
    };

     Err(Error::new(ErrorKind::NotFound, "failed to find icon"))
}


/*
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

        buf = match read_and_convert_pixbuf(result.clone()) {
            Ok(pb) => pb,
            Err(_) => Vec::new(),
        };

        g_object_unref(icon as *mut GObject);
    }

    Ok((result, buf))

}
*/

fn read_and_convert_pixbuf(result: String) -> std::result::Result<String, glib::Error> {
    let pixbuf = match Pixbuf::from_file(result.clone()) {
        Ok(data) => Ok(data),
        Err(err) => {
            eprintln!("failed to load icon pixbuf: {}", err.to_string());

            Pixbuf::from_resource(result.clone().as_str())
        }
    };

    match pixbuf {
        Ok(data) => {
            match data.save_to_bufferv("png", &[]) {
                Ok(data) => {
                    let mut du = DataUrl::new();

                    du.set_media_type(Some("image/png".to_string()));
                    du.set_data(&data);

                    Ok(du.to_string())
                },
                Err(err) => {
                    return Err(glib::Error::new(PixbufError::Failed, ""));
                }
            }
        },
        Err(err) => {
            Err(err)
        }
    }
}


