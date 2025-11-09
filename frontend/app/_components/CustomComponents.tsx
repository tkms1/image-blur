"use client";
import { AppBar, AppBarProps, Box, Button } from "@mui/material";
import Grid from "@mui/material/Grid";
import { styled } from "@mui/material/styles";
import { Stack } from "@mui/system";
import Switch from "@mui/material/Switch";
// interface CustomPaperProps extends PaperProps {
//   sx?: SxProps<Theme>;
//   children?: ReactNode;
// }
export const NoteSwitch = styled(Switch)(({ theme }) => ({
  width: 40,
  height: 24,
  padding: 0,
  "& .MuiSwitch-switchBase": {
    padding: 2,
    transform: "translateX(2px)",
    "&.Mui-checked": {
      transform: "translateX(18px)",
      color: "#fff",
      "& + .MuiSwitch-track": {
        opacity: 1,
        backgroundColor: "#009ef3",
      },
    },
  },
  "& .MuiSwitch-thumb": {
    width: 20,
    height: 20,
    boxShadow: "none",
  },
  "& .MuiSwitch-track": {
    borderRadius: 24 / 2,
    opacity: 1,
    backgroundColor: theme.palette.mode === "dark" ? "#333" : "#ccc",
    boxSizing: "border-box",
  },
}));
// const CustomPaper = (props: CustomPaperProps) => {
//   const { sx, ...otherProps } = props;
//   console.log(autocompleteClasses);
//   return (
//     <Paper
//       {...otherProps}
//       sx={{
//         ...sx,
//         bgcolor: "purple",
//         [`& .${autocompleteClasses.option}`]: {
//           color: "#FFF",
//           fontSize: "1rem",
//           fontFamily: "Verdana",
//         },
//         [`& .${autocompleteClasses.groupLabel}`]: {
//           color: "",
//           bgcolor: "#000",
//         },
//       }}
//     >
//       {props.children}
//     </Paper>
//   );
// };
// const CustomButton = styled(Button)(({ theme }) =>
//   theme.unstable_sx({
//     [`&.${buttonClasses.contained}`]: {
//       bgcolor: "customColors. royalBlue",
//       boxshadow: (theme) => theme.shadows[15],
//       color: ownerstate.size === "small" ? "#FFF" : "#000",
//       fontsize: "2rem",
//       mb: { xs: 4, sm: 3, md: 2, lg: 1, xl: 0 },
//       "&:hover": { bgcolor: "#343434" },
//       "&.Mui-disabled": { color: "#08" },
//     },
//   })
// );
export const CustomTopWeeklyButton = styled(Button)(({ theme }) =>
  theme.unstable_sx({
    bgcolor: "#FFFFFF",
    boxShadow: 4,
    // position: "absolute",
    // bottom: "20%",
    // left: "50%",
    // transform: "translateX(-50%)",
    color: "#1a3b47",
    // width: "25%",
    // p: 1,
    // mt: 2,
    fontSize: { xs: "12px", sm: "13px", md: "15px" },
    // height: "10%",
    // アウトラインボタンの色を変更
    "&.MuiButton-contained": {
      // ml: 2,
      borderWidth: "0px",
      borderColor: "black",
      fontFamily: "Noto Sans ",
      fontWeight: "bold",
      color: "#1a3b47", // テキストの色を赤に設定
    },
    // m: 5,
  })
);
export const CustomTopDailyButton = styled(Button)(({ theme }) =>
  theme.unstable_sx({
    bgcolor: "#009ef3",
    boxShadow: 4,
    // position: "absolute",
    // bottom: "20%",
    // left: "50%",
    // transform: "translateX(-50%)",
    // color: "#75939e",
    // width: "25%",
    // p: 1,
    // mt: "24px",
    fontSize: { xs: "12px", sm: "13px", md: "15px" },
    // height: "10%",
    // アウトラインボタンの色を変更
    "&.MuiButton-contained": {
      borderWidth: "0px",
      borderColor: "black",
      fontFamily: "Noto Sans ",
      fontWeight: "bold",
      color: "white", // テキストの色を赤に設定
    },
    // m: 5,
  })
);
export const CustomNotFoundButton = styled(Button)(({ theme }) =>
  theme.unstable_sx({
    bgcolor: "#009ef3",
    boxShadow: 4,
    mb: 2,
    fontSize: { xs: "12px", sm: "13px", md: "15px" },
    "&.MuiButton-contained": {
      borderWidth: "0px",
      borderColor: "black",
      fontFamily: "Noto Sans ",
      fontWeight: "bold",
      color: "white", // テキストの色を赤に設定
    },
    // m: 5,
  })
);
export const CustomNotFoundBox = styled(Box)(({ theme }) =>
  theme.unstable_sx({
    bgcolor: "white",
    my: 10,
    // mx: { xs: 5, sm: 20 },
    display: "flex",
    fontSize: { xs: "12px", sm: "13px", md: "15px" },
    width: { sm: "500px" },
    flexDirection: "column", // 縦に並べる
    alignItems: "center", // 横方向の中央揃え
    justifyContent: "center", // 縦方向の中央揃え
    // height: "100vh", // ビューポートの高さを100%に
    textAlign: "center", // テキストを中央揃え
  })
);
export const CustomNotFoundBoxContainer = styled(Box)(({ theme }) =>
  theme.unstable_sx({
    display: "flex",
    flexDirection: "column", // 縦に並べる
    alignItems: "center", // 横方向の中央揃え
    justifyContent: "center", // 縦方向の中央揃え
  })
);
export const CustomAppBar = styled(AppBar)<AppBarProps>(({ theme }) =>
  theme.unstable_sx({
    bgcolor: "#009ef3",
    color: "white",
    // zIndex: 9999,
  })
);
export const CustomBox = styled(Box)(({ theme }) =>
  theme.unstable_sx({
    bgcolor: "#FFFFFF",
  })
);
export const CustomGridWhite = styled(Grid)(({ theme }) =>
  theme.unstable_sx({
    bgcolor: "#FFFFFF",
    alignItems: "center", // アイテムを中央に揃える
    textAlign: "center", // テキストを中央に揃える
  })
);
export const CustomGridWhiteItem = styled(Grid)(({ theme }) =>
  theme.unstable_sx({
    bgcolor: "#FFFFFF",
    alignItems: "center", // アイテムを中央に揃える
    textAlign: "center", // テキストを中央に揃える
    p: 2,
    my: 2,
  })
);
export const CustomFotter = styled(Box)(({ theme }) =>
  theme.unstable_sx({
    bgcolor: "#009ef3",
    py: 5,
    textAlign: "center",
    color: "white",
    // position: "fixed",
    // position: "absolute" /*←絶対位置*/,
    // bottom: 0 /*下に固定*/,
  })
);
export const CustomTopStack = styled(Stack)(({ theme }) =>
  theme.unstable_sx({
    bgcolor: "#009ef3",
    // py: 5,
    textAlign: "center",
    // px:"auto",
    // color: "white",
    justifyContent: "center",
    alignItems: "center",
  })
);
