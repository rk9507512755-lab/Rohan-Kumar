Put each product's photos in a folder named after its slug (see ../../PRODUCT-PHOTO-FOLDERS.md):

    public/products/<product-slug>/1.jpg  ← main photo
    public/products/<product-slug>/2.jpg  …

They are attached to the product by `npm run photos:sync`, which also runs automatically on every Vercel build.
