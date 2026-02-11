# Public Assets Folder

Folder ini untuk menyimpan file static yang bisa diakses public.

## Struktur Folder:

```
public/
├── images/          # Gambar umum (banner, background, dll)
├── logos/           # Logo perusahaan, brand, dll
└── uploads/         # Upload dari user
    └── customers/   # Upload customer-specific
```

## Cara Menggunakan:

### 1. Upload via API:

```typescript
const formData = new FormData();
formData.append("file", file);
formData.append("type", "logo"); // logo, image, customer

const response = await fetch("/api/upload", {
  method: "POST",
  body: formData,
});

const result = await response.json();
console.log(result.data.url); // /logos/1234567890-logo.png
```

### 2. Akses File:

```jsx
// Di component
<Image src="/logos/logo.png" alt="Logo" width={200} height={50} />

// Atau direct URL
<img src="/images/banner.jpg" alt="Banner" />
```

### 3. Upload Manual:

Letakkan file langsung di folder yang sesuai:

- Logo → `public/logos/`
- Gambar → `public/images/`
- Upload customer → `public/uploads/customers/`

## Catatan:

- File di folder `public/` bisa diakses langsung via URL
- Maksimal ukuran file upload: 5MB
- Format yang didukung: JPG, PNG, GIF, WebP, SVG
- File akan otomatis di-rename dengan timestamp untuk avoid conflict
