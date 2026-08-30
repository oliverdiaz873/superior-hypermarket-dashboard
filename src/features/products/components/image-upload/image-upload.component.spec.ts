import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageUploadComponent } from './image-upload.component';
import { MAX_IMAGE_SIZE_BYTES } from '../../utils/product-image.util';

describe('ImageUploadComponent', () => {
  let fixture: ComponentFixture<ImageUploadComponent>;
  let component: ImageUploadComponent;

  const fileInput = () =>
    fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;

  const makeFile = (name: string, type: string, size = 1024): File => {
    return new File([new Uint8Array(size)], name, { type });
  };

  const pickFile = (file: File): void => {
    const input = fileInput();
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };

  const dropFile = (file: File): void => {
    const drop = new Event('drop') as DragEvent;
    Object.defineProperty(drop, 'dataTransfer', { value: { files: [file] } });
    fixture.nativeElement.querySelector('div').dispatchEvent(drop);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    URL.createObjectURL = jest.fn(() => 'blob:mock');
    URL.revokeObjectURL = jest.fn();
    await TestBed.configureTestingModule({ imports: [ImageUploadComponent] }).compileComponents();
    fixture = TestBed.createComponent(ImageUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('muestra el estado vacío (dropzone) sin imagen inicial', () => {
    expect(fixture.nativeElement.textContent).toContain('Arrastra una imagen aquí');
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });

  it('muestra el preview de la imagen inicial resolviendo la key relativa', () => {
    fixture.componentRef.setInput('initialImage', 'products/bebidas/coca-cola.avif');
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/uploads/products/bebidas/coca-cola.avif');
  });

  it('emite fileChange al seleccionar un archivo válido y muestra preview', () => {
    let emitted: File | null | undefined;
    component.fileChange.subscribe((f) => (emitted = f));

    pickFile(makeFile('cafe.png', 'image/png'));

    expect(emitted?.name).toBe('cafe.png');
    expect(emitted?.type).toBe('image/png');
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.src).toBe('blob:mock');
    expect(fixture.nativeElement.textContent).toContain('Nueva imagen seleccionada');
  });

  it('rechaza un formato no permitido y no emite file', () => {
    let emitted: File | null | undefined;
    component.fileChange.subscribe((f) => (emitted = f));

    pickFile(makeFile('doc.pdf', 'application/pdf'));

    expect(emitted).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Formato no permitido');
  });

  it('rechaza un archivo mayor de 5 MB', () => {
    pickFile(makeFile('big.png', 'image/png', MAX_IMAGE_SIZE_BYTES + 1));
    expect(fixture.nativeElement.textContent).toContain('supera el tamaño máximo');
  });

  it('quitar emite removeChange(true) y fileChange(null)', () => {
    pickFile(makeFile('cafe.png', 'image/png'));

    let file: File | null | undefined = null;
    let remove: boolean | undefined;
    component.fileChange.subscribe((f) => (file = f));
    component.removeChange.subscribe((r) => (remove = r));

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    const removeButton = buttons.find((b) => b.textContent?.includes('Quitar'));
    removeButton?.click();
    fixture.detectChanges();

    expect(file).toBeNull();
    expect(remove).toBe(true);
  });

  it('maneja un archivo soltado (drop)', () => {
    let emitted: File | null | undefined;
    component.fileChange.subscribe((f) => (emitted = f));

    dropFile(makeFile('cafe.png', 'image/png'));

    expect(emitted?.name).toBe('cafe.png');
  });
});
