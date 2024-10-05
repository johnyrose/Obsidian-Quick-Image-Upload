import { addIcon, App, Plugin, MarkdownView, Notice, Modal, TFile } from 'obsidian';

const ICON_NAME = 'my-image-icon';
const MY_IMAGE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
  <circle cx="8.5" cy="8.5" r="1.5"></circle>
  <polyline points="21 15 16 10 5 21"></polyline>
</svg>`;
const RIBBON_ICON_CLASS = 'quick-image-upload-ribbon-icon';
const COMMAND_ID = 'quick-image-upload';
const COMMAND_NAME = 'Quick Image Upload';
const ACCEPTED_FILE_TYPES = 'image/*';

export default class QuickImageUploadPlugin extends Plugin {
  async onload() {
    addIcon(ICON_NAME, MY_IMAGE_ICON);

    const ribbonIconEl = this.addRibbonIcon(ICON_NAME, COMMAND_NAME, () => {
      this.uploadImage();
    });
    ribbonIconEl.addClass(RIBBON_ICON_CLASS);

    this.addCommand({
      id: COMMAND_ID,
      name: COMMAND_NAME,
      callback: () => this.uploadImage(),
      icon: ICON_NAME,
    });
  }

  async uploadImage() {
    const inputEl = this.createFileInputElement();
    document.body.appendChild(inputEl);
    inputEl.click();
    document.body.removeChild(inputEl);
  }

  createFileInputElement(): HTMLInputElement {
    const inputEl = document.createElement('input');
    inputEl.type = 'file';
    inputEl.accept = ACCEPTED_FILE_TYPES;
    inputEl.style.display = 'none';
    inputEl.addEventListener('change', () => this.handleFileSelection(inputEl.files?.[0]));
    return inputEl;
  }

  async handleFileSelection(file?: File) {
    if (!file) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const fileName = await this.saveFileToVault(file, arrayBuffer);
      await this.insertImageLink(fileName);
    } catch (error) {
      console.error('Error uploading image:', error);
      new Notice('Failed to upload image.');
    }
  }

  async saveFileToVault(file: File, arrayBuffer: ArrayBuffer): Promise<string> {
    const attachmentFolder = this.getAttachmentFolder();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = file.name.split('.').pop();
    const fileName = `${attachmentFolder}/${timestamp}.${fileExtension}`;

    const imagesFolder = this.app.vault.getAbstractFileByPath(attachmentFolder);
    if (!imagesFolder) {
      await this.app.vault.createFolder(attachmentFolder);
    }

    await this.app.vault.createBinary(fileName, arrayBuffer);
    return fileName;
  }

  async insertImageLink(fileName: string) {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView) {
      activeView.editor.replaceSelection(`![[${fileName}]]`);
    } else {
      new Notice('No active editor to insert the image into.');
    }
  }

  getAttachmentFolder(): string {
    const activeFile = this.app.workspace.getActiveFile();
    // @ts-ignore
    const attachmentFolder = this.app.vault.getConfig('attachmentFolderPath');

    if (attachmentFolder === './') {
      if (activeFile && activeFile.parent) {
        return activeFile.parent.path;
      }
      return '/';
    }

    return attachmentFolder || '/';
  }
}
