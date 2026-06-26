# Page templates

Файлы в этой папке - исходные шаблоны, не браузерные страницы.

Они могут содержать директивы сборки:

```html
<!-- @include layout/header.html -->
<!-- @render page.styles -->
```

Открывайте собранные страницы из корня `Gemini`, например:

```text
Gemini/index.html
```

Внутренние UI kit шаблоны:

- `article-ui-kit.html` - заготовка под UI kit компонентов статьи.
- `all-components-ui-kit.html` - полный каталог компонентов, сохранённый отдельной страницей перед дальнейшей чисткой article kit.

После изменения шаблона пересоберите страницы из корня репозитория:

```powershell
npm.cmd run gemini:build
```
