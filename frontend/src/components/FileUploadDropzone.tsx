import { InboxOutlined } from '@ant-design/icons';
import { Upload as AntUpload } from 'antd';
import type { UploadProps } from 'antd';

const { Dragger } = AntUpload;

interface Props {
  onFileSelected: (file: File) => void;
  uploading: boolean;
}

export default function FileUploadDropzone({ onFileSelected, uploading }: Props) {
  const props: UploadProps = {
    multiple: false,
    showUploadList: false,
    disabled: uploading,
    beforeUpload: (file) => {
      onFileSelected(file);
      return false;
    },
  };

  return (
    <Dragger {...props}>
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text">Click or drag a file here to upload</p>
      <p className="ant-upload-hint">Supports .xlsx, .pdf, .png, .jpg — one file at a time</p>
    </Dragger>
  );
}
