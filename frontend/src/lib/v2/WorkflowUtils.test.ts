// Copyright 2021 The Kubeflow Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { testBestPractices } from 'src/TestUtils';
import { Workflow, WorkflowSpec, WorkflowStatus } from 'third_party/argo-ui/argo_template';
import {
  convertYamlToPlatformSpec,
  getContainer,
  isTemplateV2,
  isV2Pipeline,
} from './WorkflowUtils';
import { ComponentSpec } from 'src/generated/pipeline_spec';
import * as features from 'src/features';
import fs from 'fs';
import jsyaml from 'js-yaml';

const V2_LW_PIPELINESPEC_PATH = 'src/data/test/lightweight_python_functions_v2_pipeline_rev.yaml';
const V2_LW_YAML_TEMPLATE_STRING = fs.readFileSync(V2_LW_PIPELINESPEC_PATH, 'utf8');
const V2_PVC_PIPELINESPEC_PATH = 'src/data/test/create_mount_delete_dynamic_pvc.yaml';
const V2_PVC_YAML_STRING = fs.readFileSync(V2_PVC_PIPELINESPEC_PATH, 'utf8');
// The templateStr used in WorkflowUtils is not directly from yaml file.
// Instead, it is from BE (already been processed).
const V2_PVC_TEMPLATE_STRING_OBJ = {
  pipeline_spec: jsyaml.safeLoadAll(V2_PVC_YAML_STRING)[0],
  platform_spec: jsyaml.safeLoadAll(V2_PVC_YAML_STRING)[1],
};
const V2_PVC_TEMPLATE_STRING = jsyaml.safeDump(V2_PVC_TEMPLATE_STRING_OBJ);

testBestPractices();
describe('WorkflowUtils', () => {
  const WORKFLOW_EMPTY: Workflow = {
    metadata: {
      name: 'workflow',
    },
    // there are many unrelated fields here, omit them
    spec: {} as WorkflowSpec,
    status: {} as WorkflowStatus,
  };

  it('detects v2/v2 compatible pipeline', () => {
    const workflow = {
      ...WORKFLOW_EMPTY,
      metadata: {
        ...WORKFLOW_EMPTY.metadata,
        annotations: { 'pipelines.kubeflow.org/v2_pipeline': 'true' },
      },
    };
    expect(isV2Pipeline(workflow)).toBeTruthy();
  });

  it('detects v1 pipeline', () => {
    expect(isV2Pipeline(WORKFLOW_EMPTY)).toBeFalsy();
  });

  it('detects v2 template (yaml file without k8s platform spec)', () => {
    jest
      .spyOn(features, 'isFeatureEnabled')
      .mockImplementation(featureKey => featureKey === features.FeatureKey.V2_ALPHA);
    expect(isTemplateV2(V2_LW_YAML_TEMPLATE_STRING)).toBeTruthy();
  });

  it('detects v2 template (yaml file with k8s platform spec)', () => {
    jest
      .spyOn(features, 'isFeatureEnabled')
      .mockImplementation(featureKey => featureKey === features.FeatureKey.V2_ALPHA);
    expect(isTemplateV2(V2_PVC_TEMPLATE_STRING)).toBeTruthy();
  });

  it('converts yaml to PlatformSpec (yaml with k8s platform spec)', () => {
    const platformSpec = convertYamlToPlatformSpec(V2_PVC_TEMPLATE_STRING);
    expect(platformSpec).toEqual({
      platforms: {
        kubernetes: {
          deploymentSpec: {
            executors: {
              'exec-consumer': {
                pvcMount: [
                  {
                    mountPath: '/data',
                    taskOutputParameter: {
                      outputParameterKey: 'name',
                      producerTask: 'createpvc',
                    },
                  },
                ],
              },
              'exec-producer': {
                pvcMount: [
                  {
                    mountPath: '/data',
                    taskOutputParameter: {
                      outputParameterKey: 'name',
                      producerTask: 'createpvc',
                    },
                  },
                ],
              },
            },
          },
        },
      },
    });
  });

  it('returns undefined if converting yaml "without k8s platform spec" PlatformSpec', () => {
    const platformSpec = convertYamlToPlatformSpec(V2_LW_YAML_TEMPLATE_STRING);
    expect(platformSpec).toEqual(undefined);
  });

  it('get container of given component from pipelineSpec', () => {
    const pipelineSpecStr = V2_LW_YAML_TEMPLATE_STRING;
    const componentSpec = {} as ComponentSpec;
    componentSpec.executorLabel = 'exec-preprocess';

    const container = getContainer(componentSpec, pipelineSpecStr);

    expect(container).toEqual({
      args: ['--executor_input', '{{$}}', '--function_to_execute', 'preprocess'],
      command: [
        'sh',
        '-c',
        '\n\
if ! [ -x "$(command -v pip)" ]; then\n\
    python3 -m ensurepip || python3 -m ensurepip --user || apt-get install python3-pip\n\
fi\n\
\n\
PIP_DISABLE_PIP_VERSION_CHECK=1 python3 -m pip install --quiet     --no-warn-script-location \'kfp==2.0.0-alpha.1\' && "$0" "$@"\n\
',
        'sh',
        '-ec',
        'program_path=$(mktemp -d)\nprintf "%s" "$0" > "$program_path/ephemeral_component.py"\npython3 -m kfp.components.executor_main                         --component_module_path                         "$program_path/ephemeral_component.py"                         "$@"\n',
        "\nimport kfp\nfrom kfp import dsl\nfrom kfp.dsl import *\nfrom typing import *\n\ndef preprocess(\n    # An input parameter of type string.\n    message: str,\n    # An input parameter of type dict.\n    input_dict_parameter: Dict[str, int],\n    # An input parameter of type list.\n    input_list_parameter: List[str],\n    # Use Output[T] to get a metadata-rich handle to the output artifact\n    # of type `Dataset`.\n    output_dataset_one: Output[Dataset],\n    # A locally accessible filepath for another output artifact of type\n    # `Dataset`.\n    output_dataset_two_path: OutputPath('Dataset'),\n    # A locally accessible filepath for an output parameter of type string.\n    output_parameter_path: OutputPath(str),\n    # A locally accessible filepath for an output parameter of type bool.\n    output_bool_parameter_path: OutputPath(bool),\n    # A locally accessible filepath for an output parameter of type dict.\n    output_dict_parameter_path: OutputPath(Dict[str, int]),\n    # A locally accessible filepath for an output parameter of type list.\n    output_list_parameter_path: OutputPath(List[str]),\n):\n    \"\"\"Dummy preprocessing step.\"\"\"\n\n    # Use Dataset.path to access a local file path for writing.\n    # One can also use Dataset.uri to access the actual URI file path.\n    with open(output_dataset_one.path, 'w') as f:\n        f.write(message)\n\n    # OutputPath is used to just pass the local file path of the output artifact\n    # to the function.\n    with open(output_dataset_two_path, 'w') as f:\n        f.write(message)\n\n    with open(output_parameter_path, 'w') as f:\n        f.write(message)\n\n    with open(output_bool_parameter_path, 'w') as f:\n        f.write(\n            str(True))  # use either `str()` or `json.dumps()` for bool values.\n\n    import json\n    with open(output_dict_parameter_path, 'w') as f:\n        f.write(json.dumps(input_dict_parameter))\n\n    with open(output_list_parameter_path, 'w') as f:\n        f.write(json.dumps(input_list_parameter))\n\n",
      ],
      env: [],
      image: 'python:3.7',
      lifecycle: undefined,
      resources: undefined,
    });
  });

  it('get container of given component from pipelineSpec in yaml with multiple spec', () => {
    const templateStr = V2_PVC_TEMPLATE_STRING;
    const componentSpec = {} as ComponentSpec;
    componentSpec.executorLabel = 'exec-producer';

    const container = getContainer(componentSpec, templateStr);

    expect(container).toEqual({
      args: ['--executor_input', '{{$}}', '--function_to_execute', 'producer'],
      command: [
        'sh',
        '-c',
        '\n\
if ! [ -x "$(command -v pip)" ]; then\n\
    python3 -m ensurepip || python3 -m ensurepip --user || apt-get install python3-pip\n\
fi\n\
\n\
PIP_DISABLE_PIP_VERSION_CHECK=1 python3 -m pip install --quiet     --no-warn-script-location \'kfp==2.0.0-beta.16\' && "$0" "$@"\n\
',
        'sh',
        '-ec',
        'program_path=$(mktemp -d)\nprintf "%s" "$0" > "$program_path/ephemeral_component.py"\npython3 -m kfp.components.executor_main                         --component_module_path                         "$program_path/ephemeral_component.py"                         "$@"\n',
        "\nimport kfp\nfrom kfp import dsl\nfrom kfp.dsl import *\nfrom typing import *\n\ndef producer() -> str:\n    with open('/data/file.txt', 'w') as file:\n        file.write('Hello world')\n    with open('/data/file.txt', 'r') as file:\n        content = file.read()\n    print(content)\n    return content\n\n",
      ],
      env: [],
      image: 'python:3.7',
      lifecycle: undefined,
      resources: undefined,
    });
  });
});
