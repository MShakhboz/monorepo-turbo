// create-site.js
// Использование: node create-site.js <site-name>

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import net from "net";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(
    "Пожалуйста, укажите имя нового сайта: node create-site.js <site-name>"
  );
  process.exit(1);
}

const siteName = args[0];
const templatePath = path.join(__dirname, "apps", "seed-template");
const newSitePath = path.join(__dirname, "apps", siteName);

if (!fs.existsSync(templatePath)) {
  console.error("Шаблон seed-template не найден в папке apps/");
  process.exit(1);
}

if (fs.existsSync(newSitePath)) {
  console.error(`Сайт с именем ${siteName} уже существует!`);
  process.exit(1);
}

// Функция рекурсивного копирования
function copyFolderSync(from, to) {
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach((element) => {
    const stat = fs.lstatSync(path.join(from, element));
    if (stat.isFile()) {
      fs.copyFileSync(path.join(from, element), path.join(to, element));
    } else if (stat.isDirectory()) {
      copyFolderSync(path.join(from, element), path.join(to, element));
    }
  });
}

// Функция проверки, занят ли порт
function isPortTaken(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(true));
    server.once("listening", () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

// Функция поиска свободного порта
async function getAvailablePort(startPort = 3000) {
  let port = startPort;
  while (await isPortTaken(port)) {
    port++;
  }
  return port;
}

// Основная логика
(async () => {
  // Копируем шаблон
  copyFolderSync(templatePath, newSitePath);

  // Генерируем уникальный порт
  const port = await getAvailablePort(3000);

  // Создаем базовый site.config.json
  const configPath = path.join(newSitePath, "site.config.json");
  const defaultConfig = {
    name: siteName,
    theme: "default",
    locale: "en",
    featureFlags: {},
    port, // уникальный порт
  };
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), "utf-8");

  // Обновляем имя workspace в package.json
  const packageJsonPath = path.join(newSitePath, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    pkg.name = siteName; // уникальное имя workspace
    fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2), "utf-8");
  }

  console.log(`Сайт "${siteName}" успешно создан в apps/${siteName}`);
  console.log(`Сайт будет запускаться на порту: ${port}`);

  // Установка зависимостей (опционально)
  try {
    execSync(`cd ${newSitePath} && yarn install`, { stdio: "inherit" });
    console.log("Зависимости установлены.");
  } catch (err) {
    console.warn(
      'Не удалось автоматически установить зависимости. Установите их вручную через "yarn install".'
    );
  }
})();
