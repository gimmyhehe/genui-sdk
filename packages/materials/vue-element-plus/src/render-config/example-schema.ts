export const formSchema = {
  state: {
    formData: {
      name: '张三',
      sex: '男',
      department: 'HR',
      protocolStart: '2023-01-01',
      email: '',
    },
  },
  methods: {
    departChange: {
      type: 'JSFunction',
      value: 'function departChange(value) { console.log(value) }',
    },
  },
  componentName: 'Page',
  props: {
    style: 'width: 414px;',
  },
  children: [
    {
      componentName: 'h3',
      props: {},
      children: '更新员工信息',
    },
    {
      componentName: 'ElForm',
      props: {
        model: {
          type: 'JSExpression',
          value: 'this.state.formData',
        },
        labelPosition: 'top',
      },
      children: [
        {
          componentName: 'ElFormItem',
          props: {
            label: '姓名',
            prop: 'name',
            required: true,
          },
          children: [
            {
              componentName: 'ElInput',
              props: {
                placeholder: '请输入',
                modelValue: {
                  type: 'JSExpression',
                  model: true,
                  value: 'this.state.formData.name',
                },
              },
            },
          ],
        },
        {
          componentName: 'ElFormItem',
          props: {
            label: '性别',
            prop: 'sex',
          },
          children: [
            {
              componentName: 'ElRadioGroup',
              props: {
                modelValue: {
                  type: 'JSExpression',
                  model: true,
                  value: 'this.state.formData.sex',
                },
              },
              children: [
                {
                  componentName: 'ElRadio',
                  props: { label: '男', value: '男' },
                },
                {
                  componentName: 'ElRadio',
                  props: { label: '女', value: '女' },
                },
              ],
            },
          ],
        },
        {
          componentName: 'ElFormItem',
          props: {
            label: '部门',
            prop: 'department',
            required: true,
          },
          children: [
            {
              componentName: 'ElSelect',
              props: {
                placeholder: '请选择',
                modelValue: {
                  type: 'JSExpression',
                  model: true,
                  value: 'this.state.formData.department',
                },
              },
              children: [
                { componentName: 'ElOption', props: { label: '人事部', value: 'HR' } },
                { componentName: 'ElOption', props: { label: '其他部门', value: 'other' } },
              ],
            },
          ],
        },
        {
          componentName: 'ElFormItem',
          props: {
            label: '入职日期',
            prop: 'protocolStart',
          },
          children: [
            {
              componentName: 'ElDatePicker',
              props: {
                type: 'date',
                placeholder: '请选择日期',
                modelValue: {
                  type: 'JSExpression',
                  model: true,
                  value: 'this.state.formData.protocolStart',
                },
              },
            },
          ],
        },
        {
          componentName: 'ElFormItem',
          props: { label: '' },
          children: [
            {
              componentName: 'ElButton',
              props: {
                type: 'primary',
                children: '确认',
              },
            },
          ],
        },
      ],
    },
  ],
};

export const infoCardSchema = {
  componentName: 'Page',
  children: [
    {
      componentName: 'Text',
      props: {
        style: 'font-size: 14px;font-weight: bold;line-height:2;margin-bottom:20px;display:block;',
        text: '员工信息详情',
      },
    },
    {
      componentName: 'ElCard',
      props: {
        header: '基本信息',
        shadow: 'never',
      },
      children: [
        {
          componentName: 'ElRow',
          props: { gutter: 12 },
          children: [
            {
              componentName: 'ElCol',
              props: { span: 6 },
              children: [{ componentName: 'Text', props: { text: '姓名' } }],
            },
            {
              componentName: 'ElCol',
              props: { span: 18 },
              children: [{ componentName: 'Text', props: { text: '张三' } }],
            },
          ],
        },
        {
          componentName: 'ElDivider',
          props: {},
        },
        {
          componentName: 'ElRow',
          props: { gutter: 12 },
          children: [
            {
              componentName: 'ElCol',
              props: { span: 6 },
              children: [{ componentName: 'Text', props: { text: '电话' } }],
            },
            {
              componentName: 'ElCol',
              props: { span: 18 },
              children: [{ componentName: 'Text', props: { text: '18856254558' } }],
            },
          ],
        },
      ],
    },
  ],
};

export const tableSchema = {
  componentName: 'Page',
  props: {
    style: 'padding: 16px;',
  },
  children: [
    {
      componentName: 'h3',
      children: '员工列表',
    },
    {
      componentName: 'ElTable',
      props: {
        data: [
          { name: '张三', id: '10001', sex: '男', department: 'HR', protocolStart: '2023-01-01' },
          { name: '李四', id: '10002', sex: '女', department: '研发', protocolStart: '2022-06-15' },
        ],
        stripe: true,
        style: 'width: 100%',
      },
      children: [
        { componentName: 'ElTableColumn', props: { prop: 'name', label: '姓名', width: 120 } },
        { componentName: 'ElTableColumn', props: { prop: 'id', label: '工号', width: 100 } },
        { componentName: 'ElTableColumn', props: { prop: 'sex', label: '性别', width: 80 } },
        { componentName: 'ElTableColumn', props: { prop: 'department', label: '部门' } },
        { componentName: 'ElTableColumn', props: { prop: 'protocolStart', label: '入职日期', width: 140 } },
      ],
    },
  ],
};

export const examples = [
  { name: '双向绑定的表单', schema: formSchema },
  { name: '信息展示卡片', schema: infoCardSchema },
  { name: '数据表格', schema: tableSchema },
];
