// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;

/// Web implementation using localStorage.
String? read(String key) {
  return html.window.localStorage[key];
}

void write(String key, String value) {
  html.window.localStorage[key] = value;
}

void delete(String key) {
  html.window.localStorage.remove(key);
}

void deleteAll() {
  html.window.localStorage.clear();
}
