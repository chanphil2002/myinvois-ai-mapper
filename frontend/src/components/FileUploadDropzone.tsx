import { InboxOutlined, LoadingOutlined } from '@ant-design/icons';
import { Upload as AntUpload, Spin } from 'antd';
import type { UploadProps } from 'antd';

const { Dragger } = AntUpload;

interface Props {
  onFileSelected: (file: File) => void;
  uploading: boolean;
  /** Allow selecting several files at once (each is handed to onFileSelected). */
  multiple?: boolean;
  hint?: string;
  /** Message shown with the spinner while a single upload is in progress. */
  uploadingText?: string;
}

export default function FileUploadDropzone({
  onFileSelected,
  uploading,
  multiple = false,
  hint,
  uploadingText = 'Uploading and parsing…',
}: Props) {
  const props: UploadProps = {
    multiple,
    showUploadList: false,
    // In multi-file mode keep the dropzone usable so more files can be added while others upload.
    disabled: uploading && !multiple,
    beforeUpload: (file) => {
      onFileSelected(file);
      return false; // handle the upload ourselves; don't let antd POST it
    },
  };

  return (
    <Dragger {...props}>
      {uploading && !multiple ? (
        <div style={{ padding: '12px 0' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 28 }} spin />} />
          <p className="ant-upload-text" style={{ marginTop: 14 }}>
            {uploadingText}
          </p>
          <p className="ant-upload-hint">This can take a few moments — please wait.</p>
        </div>
      ) : (
        <>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag {multiple ? 'files' : 'a file'} here to upload</p>
          <p className="ant-upload-hint">
            {hint ?? 'Supports .xlsx, .pdf, .png, .jpg — one file at a time'}
          </p>
        </>
      )}
    </Dragger>
  );
}
