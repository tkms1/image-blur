// BlurControls.tsx（クリアボタンを削除 → page.tsx に統合）
import { Box, Slider, Typography } from "@mui/material";

type Props = {
  blurRadius: number;
  blurStrength: number;
  onRadiusChange: (value: number) => void;
  onStrengthChange: (value: number) => void;
  onClearAll: () => void;
};

export default function BlurControls({
  blurRadius,
  blurStrength,
  onRadiusChange,
  onStrengthChange,
}: Props) {
  return (
    <Box
      sx={{ display: "flex", gap: 3, flexWrap: "wrap", alignItems: "center" }}
    >
      <Box sx={{ minWidth: 200 }}>
        <Typography variant="body2">ぼかしサイズ: {blurRadius}px</Typography>
        <Slider
          value={blurRadius}
          min={10}
          max={200}
          step={5}
          onChange={(_, v) => onRadiusChange(v as number)}
        />
      </Box>

      <Box sx={{ minWidth: 200 }}>
        <Typography variant="body2">ぼかし強度: {blurStrength}</Typography>
        <Slider
          value={blurStrength}
          min={2}
          max={30}
          step={1}
          onChange={(_, v) => onStrengthChange(v as number)}
        />
      </Box>
    </Box>
  );
}
