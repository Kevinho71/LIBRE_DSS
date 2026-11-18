export interface PresignedUrlRequestDto {
  filename: string;
  contentType: string;
}

export interface PresignedUrlResponseDto {
  uploadUrl: string;
  key: string;
  expiresInSeconds: number;
}
