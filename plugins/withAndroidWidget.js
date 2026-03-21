const {
  withAndroidManifest,
  withDangerousMod,
  withStringsXml,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PACKAGE_NAME = "com.workroster.app";
const WIDGET_CLASS = "WorkRosterWidget";

function withAndroidWidget(config) {
  config = withWidgetFiles(config);
  config = withAndroidManifestWidget(config);
  config = withWidgetStrings(config);
  return config;
}

function withWidgetFiles(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const androidResDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res"
      );
      const pluginDir = path.join(__dirname, "android-widget");
      const srcDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "java",
        ...PACKAGE_NAME.split(".")
      );

      fs.mkdirSync(path.join(androidResDir, "layout"), { recursive: true });
      fs.mkdirSync(path.join(androidResDir, "drawable"), { recursive: true });
      fs.mkdirSync(path.join(androidResDir, "xml"), { recursive: true });
      fs.mkdirSync(srcDir, { recursive: true });

      copyFile(
        path.join(pluginDir, "res", "layout", "widget_work_roster.xml"),
        path.join(androidResDir, "layout", "widget_work_roster.xml")
      );
      copyFile(
        path.join(pluginDir, "res", "drawable", "widget_background.xml"),
        path.join(androidResDir, "drawable", "widget_background.xml")
      );
      copyFile(
        path.join(pluginDir, "res", "drawable", "widget_bg_morning.xml"),
        path.join(androidResDir, "drawable", "widget_bg_morning.xml")
      );
      copyFile(
        path.join(pluginDir, "res", "drawable", "widget_bg_evening.xml"),
        path.join(androidResDir, "drawable", "widget_bg_evening.xml")
      );
      copyFile(
        path.join(pluginDir, "res", "drawable", "widget_bg_night.xml"),
        path.join(androidResDir, "drawable", "widget_bg_night.xml")
      );
      copyFile(
        path.join(pluginDir, "res", "drawable", "widget_bg_rest.xml"),
        path.join(androidResDir, "drawable", "widget_bg_rest.xml")
      );
      copyFile(
        path.join(pluginDir, "res", "xml", "widget_work_roster_info.xml"),
        path.join(androidResDir, "xml", "widget_work_roster_info.xml")
      );

      const kotlinSrc = fs.readFileSync(
        path.join(pluginDir, "src", "WorkRosterWidget.kt"),
        "utf8"
      );
      fs.writeFileSync(
        path.join(srcDir, `${WIDGET_CLASS}.kt`),
        kotlinSrc,
        "utf8"
      );

      return config;
    },
  ]);
}

function withAndroidManifestWidget(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];

    if (!application.receiver) {
      application.receiver = [];
    }

    const existingReceiver = application.receiver.find(
      (r) => r.$?.["android:name"] === `.${WIDGET_CLASS}`
    );

    if (!existingReceiver) {
      application.receiver.push({
        $: {
          "android:name": `.${WIDGET_CLASS}`,
          "android:exported": "true",
          "android:label": "@string/widget_name",
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name": "android.appwidget.action.APPWIDGET_UPDATE",
                },
              },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.appwidget.provider",
              "android:resource": "@xml/widget_work_roster_info",
            },
          },
        ],
      });
    }

    return config;
  });
}

function withWidgetStrings(config) {
  return withStringsXml(config, (config) => {
    const strings = config.modResults.resources.string || [];

    const hasWidgetName = strings.some(
      (s) => s.$?.name === "widget_name"
    );
    const hasWidgetDesc = strings.some(
      (s) => s.$?.name === "widget_description"
    );

    if (!hasWidgetName) {
      strings.push({
        $: { name: "widget_name" },
        _: "WorkRoster Widget",
      });
    }
    if (!hasWidgetDesc) {
      strings.push({
        $: { name: "widget_description" },
        _: "Shows your current shift",
      });
    }

    config.modResults.resources.string = strings;
    return config;
  });
}

function copyFile(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  } else {
    console.warn(`Widget file not found: ${src}`);
  }
}

module.exports = withAndroidWidget;
