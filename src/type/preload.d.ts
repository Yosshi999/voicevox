import { IpcRenderer, IpcRendererEvent } from "electron";

export interface Sandbox {
  getAppInfos(): Promise<AppInfos>;
  getCharacterInfos(): Promise<CharacterInfo[]>;
  getPolicyText(): Promise<string>;
  getOssLicenses(): Promise<Record<string, string>[]>;
  getUpdateInfos(): Promise<UpdateInfo[]>;
  saveTempAudioFile(obj: { relativePath: string; buffer: ArrayBuffer }): void;
  loadTempFile(): Promise<string>;
  getBaseName(obj: { filePath: string }): string;
  showAudioSaveDialog(obj: {
    title: string;
    defaultPath?: string;
  }): Promise<string | undefined>;
  showOpenDirectoryDialog(obj: { title: string }): Promise<string | undefined>;
  showProjectSaveDialog(obj: { title: string }): Promise<string | undefined>;
  showProjectLoadDialog(obj: { title: string }): Promise<string[] | undefined>;
  showConfirmDialog(obj: { title: string; message: string }): Promise<boolean>;
  showWarningDialog(obj: {
    title: string;
    message: string;
  }): Promise<Electron.MessageBoxReturnValue>;
  showErrorDialog(obj: {
    title: string;
    message: string;
  }): Promise<Electron.MessageBoxReturnValue>;
  showImportFileDialog(obj: { title: string }): Promise<string | undefined>;
  writeFile(obj: { filePath: string; buffer: ArrayBuffer }): void;
  readFile(obj: { filePath: string }): Promise<ArrayBuffer>;
  openTextEditContextMenu(): Promise<void>;
  useGpu(newValue?: boolean): Promise<boolean>;
  isAvailableGPUMode(): Promise<boolean>;
  onReceivedIPCMsg<T extends keyof IpcSOData>(
    channel: T,
    listener: (event: IpcRendererEvent, ...args: IpcSOData[T]["args"]) => void
  ): IpcRenderer;
  closeWindow(): void;
  minimizeWindow(): void;
  maximizeWindow(): void;
  logError(...params: unknown[]): void;
  logInfo(...params: unknown[]): void;
  restartEngine(): Promise<void>;
  savingSetting(newData?: SavingSetting): Promise<SavingSetting>;
  hotkeySettings(newData?: HotkeySetting): Promise<HotkeySetting[]>;
  checkFileExists(file: string): Promise<boolean>;
  changePinWindow(): void;
}

export type AppInfos = {
  name: string;
  version: string;
};

export type CharacterInfo = {
  dirPath: string;
  iconPath: string;
  portraitPath: string;
  iconBlob?: Blob;
  portraitBlob?: Blob;
  metas: {
    name: string;
    speaker: number;
    policy: string;
  };
};

export type UpdateInfo = {
  version: string;
  descriptions: string[];
  contributors: string[];
};

export type Encoding = "UTF-8" | "Shift_JIS";

export type SavingSetting = {
  exportLab: boolean;
  fileEncoding: Encoding;
  fixedExportEnabled: boolean;
  fixedExportDir: string;
  avoidOverwrite: boolean;
};

export type HotkeySetting = {
  action: HotkeyAction;
  combination: HotkeyCombo;
};

export type HotkeyAction =
  | "音声書き出し"
  | "一つだけ書き出し"
  | "再生/停止"
  | "連続再生/停止"
  | "ｱｸｾﾝﾄ欄を表示"
  | "ｲﾝﾄﾈｰｼｮﾝ欄を表示"
  | "テキスト欄を追加"
  | "テキスト欄を削除"
  | "テキスト欄からフォーカスを外す"
  | "テキスト欄にフォーカスを戻す"
  | "元に戻す"
  | "やり直す"
  | "新規プロジェクト"
  | "プロジェクトを名前を付けて保存"
  | "プロジェクトを上書き保存"
  | "プロジェクト読み込み"
  | "テキスト読み込む";

export type HotkeyCombo = string;

export type HotkeyReturnType =
  | void
  | boolean
  | Promise<void>
  | Promise<boolean>;
