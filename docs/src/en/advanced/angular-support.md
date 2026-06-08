# Angular Support

GenUI SDK supports using the schema renderer in Angular applications. Built on the TinyUI component library, it lets you dynamically render Angular components from JSON schema.

## Cross-Stack Protocol Compatibility

The Angular schema renderer uses the same JSON Schema protocol format as the Vue version, ensuring cross-framework compatibility. The schema protocol defines component structure, state, methods, and rendering logic, and can be migrated seamlessly across technology stacks.

### Complete schemaJson

Schema JSON is a standard JSON object:

```json
{
  "componentName": "Page",
  "state": {
    "formData": {
      "name": "",
      "email": ""
    }
  },
  "methods": {
    "handleSubmit": {
      "type": "JSFunction",
      "value": "function handleSubmit() { console.log('Form submit:', this.state.formData) }"
    }
  },
  "children": [
    {
      "componentName": "TiFormField",
      "props": {
        "style": "padding: 20px; max-width: 500px;"
      },
      "children": [
        {
          "componentName": "TiItem",
          "props": {
            "label": "Name",
            "labelWidth": "100px"
          },
          "children": [
            {
              "componentName": "TiText",
              "props": {
                "placeholder": "Enter name",
                "ngModel": {
                  "type": "JSExpression",
                  "model": true,
                  "value": "this.state.formData.name"
                }
              },
              "directives": [
                {
                  "directiveName": "ngModel"
                },
                {
                  "directiveName": "defaultValueAccessor"
                }
              ]
            }
          ]
        },
        {
          "componentName": "TiItem",
          "props": {
            "label": "Email",
            "labelWidth": "100px"
          },
          "children": [
            {
              "componentName": "TiText",
              "props": {
                "placeholder": "Enter email",
                "ngModel": {
                  "type": "JSExpression",
                  "model": true,
                  "value": "this.state.formData.email"
                }
              },
              "directives": [
                {
                  "directiveName": "ngModel"
                },
                {
                  "directiveName": "defaultValueAccessor"
                }
              ]
            }
          ]
        },
        {
          "componentName": "div",
          "props": {
            "style": "display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end;"
          },
          "children": [
            {
              "componentName": "TiButton",
              "props": {
                "color": "primary",
                "onClick": {
                  "type": "JSExpression",
                  "value": "this.handleSubmit"
                }
              },
              "children": "Submit"
            }
          ]
        }
      ]
    }
  ]
}
```

## Basic Usage

### 1. Import the component

Import `RendererMain` in your Angular component:

```typescript
import { Component, signal } from '@angular/core';
import { RendererMain } from 'tiny-schema-renderer-ng';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [RendererMain, FormsModule],
  template: ` <tiny-schema-renderer [schema]="schema()"></tiny-schema-renderer> `,
})
export class ExampleComponent {
  schema = signal<any>({});

  async ngOnInit() {
    // Load your schema
    this.schema.set(await import('./schema.json').then((m) => m.default));
  }
}
```

### 2. Import styles

Import TinyUI styles in `main.ts` or your global stylesheet:

```typescript
import '@opentiny/ng-themes/styles.css';
import '@opentiny/ng-themes/theme-default.css';
```

## Angular Chat Component

The integrated Angular Chat component is still under development. Stay tuned!
