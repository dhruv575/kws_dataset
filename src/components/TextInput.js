import React from 'react';
import styled from 'styled-components';

const InputGroup = styled.div`
  margin-bottom: 1.5rem;
  width: 100%;
  max-width: 400px;
`;

const Label = styled.label`
  font-weight: bold;
  display: block;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.span`
  font-size: 0.9rem;
  color: #555;
  display: block;
  margin-top: 0.25rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.5rem;
  margin-top: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 5px;
  &:disabled {
    background-color: #f5f5f5;
  }
`;

const TextInput = ({ label, subtitle, value, onChange, placeholder, disabled }) => (
  <InputGroup>
    <Label>{label}</Label>
    {subtitle && <Subtitle>{subtitle}</Subtitle>}
    <Input 
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
    />
  </InputGroup>
);

export default TextInput;