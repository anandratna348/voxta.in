/// Stable id of this Windows installation. The app hashes it before sending anything to the license server.
#[tauri::command]
fn device_id() -> Result<String, String> {
    machine_uid::get().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![device_id])
        .run(tauri::generate_context!())
        .expect("error while running Voxta");
}