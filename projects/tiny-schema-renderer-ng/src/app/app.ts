import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { materials } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/materials';
import { RendererMain } from '../../projects/renderer/src/renderer-main';
import { RENDERER_SETTINGS } from '../../projects/renderer/src/renderer-settings';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: true,
  imports: [RendererMain, FormsModule],
  providers: [
    {
      provide: RENDERER_SETTINGS,
      useValue: { materials },
    },
  ],
})
export class App {
  schema = signal<any>({});

  async ngOnInit() {
    this.schema.set(await import('../mock/schema.json').then((m) => m.default));
  }
}
