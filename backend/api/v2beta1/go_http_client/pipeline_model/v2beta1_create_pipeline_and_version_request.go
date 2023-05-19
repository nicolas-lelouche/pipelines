// Code generated by go-swagger; DO NOT EDIT.

package pipeline_model

// This file was generated by the swagger tool.
// Editing this file might prove futile when you re-run the swagger generate command

import (
	strfmt "github.com/go-openapi/strfmt"

	"github.com/go-openapi/errors"
	"github.com/go-openapi/swag"
)

// V2beta1CreatePipelineAndVersionRequest v2beta1 create pipeline and version request
// swagger:model v2beta1CreatePipelineAndVersionRequest
type V2beta1CreatePipelineAndVersionRequest struct {

	// Required input. Pipeline (parent) to be created.
	Pipeline *V2beta1Pipeline `json:"pipeline,omitempty"`

	// Required input. Pipeline version (child) to be created.
	// Pipeline spec will be downloaded from pipeline_version.package_url.
	PipelineVersion *V2beta1PipelineVersion `json:"pipeline_version,omitempty"`
}

// Validate validates this v2beta1 create pipeline and version request
func (m *V2beta1CreatePipelineAndVersionRequest) Validate(formats strfmt.Registry) error {
	var res []error

	if err := m.validatePipeline(formats); err != nil {
		res = append(res, err)
	}

	if err := m.validatePipelineVersion(formats); err != nil {
		res = append(res, err)
	}

	if len(res) > 0 {
		return errors.CompositeValidationError(res...)
	}
	return nil
}

func (m *V2beta1CreatePipelineAndVersionRequest) validatePipeline(formats strfmt.Registry) error {

	if swag.IsZero(m.Pipeline) { // not required
		return nil
	}

	if m.Pipeline != nil {
		if err := m.Pipeline.Validate(formats); err != nil {
			if ve, ok := err.(*errors.Validation); ok {
				return ve.ValidateName("pipeline")
			}
			return err
		}
	}

	return nil
}

func (m *V2beta1CreatePipelineAndVersionRequest) validatePipelineVersion(formats strfmt.Registry) error {

	if swag.IsZero(m.PipelineVersion) { // not required
		return nil
	}

	if m.PipelineVersion != nil {
		if err := m.PipelineVersion.Validate(formats); err != nil {
			if ve, ok := err.(*errors.Validation); ok {
				return ve.ValidateName("pipeline_version")
			}
			return err
		}
	}

	return nil
}

// MarshalBinary interface implementation
func (m *V2beta1CreatePipelineAndVersionRequest) MarshalBinary() ([]byte, error) {
	if m == nil {
		return nil, nil
	}
	return swag.WriteJSON(m)
}

// UnmarshalBinary interface implementation
func (m *V2beta1CreatePipelineAndVersionRequest) UnmarshalBinary(b []byte) error {
	var res V2beta1CreatePipelineAndVersionRequest
	if err := swag.ReadJSON(b, &res); err != nil {
		return err
	}
	*m = res
	return nil
}