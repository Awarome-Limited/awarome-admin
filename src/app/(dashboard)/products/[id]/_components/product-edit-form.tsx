'use client';

import { SaveBar } from '@/components/save-bar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminProduct } from '@/lib/types';
import { useEditForm } from '@/lib/use-edit-form';
import { updateProduct } from '../../actions';

const DELIVERY_METHODS = ['bike', 'car', 'truck'] as const;

const selectClass =
  'field w-full pr-9';

interface Category {
  _id: string;
  name: string;
}

interface FormState {
  name: string;
  price: string;
  quantityAvailable: string;
  category: string;
  deliveryMethod: string;
  isAvailable: string;
  description: string;
  [key: string]: string;
}

function categoryId(product: AdminProduct): string {
  if (!product.category) return '';
  if (typeof product.category === 'string') return product.category;
  return product.category._id;
}

export function ProductEditForm({
  product,
  categories,
}: {
  product: AdminProduct;
  categories: Category[];
}) {
  const { values, set, submit, isPending, dirty, reset } = useEditForm<FormState>(
    {
      name: product.name ?? '',
      price: product.price != null ? String(product.price) : '',
      quantityAvailable:
        product.quantityAvailable != null ? String(product.quantityAvailable) : '',
      category: categoryId(product),
      deliveryMethod: product.deliveryMethod ?? '',
      isAvailable: product.isAvailable ? 'true' : 'false',
      description: product.description ?? '',
    },
    (form) =>
      updateProduct(product._id, {
        // Blank optional fields are omitted rather than sent as "" — the API
        // validates with Joi, which rejects empty strings and fails the whole
        // update rather than just that field.
        name: form.name.trim() || undefined,
        price: form.price === '' ? undefined : Number(form.price),
        quantityAvailable:
          form.quantityAvailable === ''
            ? undefined
            : Number(form.quantityAvailable),
        description: form.description.trim() || undefined,
        category: form.category || undefined,
        deliveryMethod: form.deliveryMethod || undefined,
        isAvailable: form.isAvailable === 'true',
      }),
    {
      successMessage: 'Product updated.',
      errorMessage: 'Failed to update product.',
    }
  );

  return (
    <div
      id="edit-product"
      className="flex flex-col gap-[18px] rounded-[10px] border border-border bg-card px-6 py-[22px]"
    >
      <h3 className="text-[17px] leading-tight font-bold">Edit product</h3>
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={values.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="price">Price (₦)</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={values.price}
              onChange={(e) => set({ price: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="quantityAvailable">Stock quantity</Label>
            <Input
              id="quantityAvailable"
              type="number"
              min="0"
              value={values.quantityAvailable}
              onChange={(e) => set({ quantityAvailable: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={values.category}
              onChange={(e) => set({ category: e.target.value })}
              className={selectClass}
            >
              <option value="">— Select category —</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="deliveryMethod">Delivery method</Label>
            <select
              id="deliveryMethod"
              value={values.deliveryMethod}
              onChange={(e) => set({ deliveryMethod: e.target.value })}
              className={selectClass}
            >
              <option value="">— Select method —</option>
              {DELIVERY_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="isAvailable">Availability</Label>
            <select
              id="isAvailable"
              value={values.isAvailable}
              onChange={(e) => set({ isAvailable: e.target.value })}
              className={selectClass}
            >
              <option value="true">In stock</option>
              <option value="false">Unavailable</option>
            </select>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={4}
              value={values.description}
              onChange={(e) => set({ description: e.target.value })}
              className="field-area w-full"
            />
          </div>
        </div>
      <SaveBar
        dirty={dirty}
        saving={isPending}
        label="Unsaved product changes"
        onDiscard={reset}
        onSave={() => submit()}
      />
      </div>
    </div>
  );
}
