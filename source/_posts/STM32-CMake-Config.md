---
title: STM32 CMake 工程构建与开发环境配置
date: 2026-11-16 23:00:00
tags: [STM32, CMake, VSCode, 嵌入式]
categories: [嵌入式学习]
---
> 关键字： 工具链配置 Debug 

这个是去年大概这个时候配置环境写的配置说明，现在来看这里面配置是没错误的，但是有一些东西过时了，以及表达不明确。博主已经改用kubuntu26.04作为日常系统和工作系统了

## 一、开发工具链说明

> TODO: 目前配置文档写的仍不完善，无法傻瓜式的装好对应的东西。需要之后再来重新整理这个文件

需要下载的工具链：

1. **CMake** - 跨平台构建系统生成器，用于管理项目的编译流程和依赖关系
2. **clang 和 LLVM** - 提供高级代码分析、语法高亮和智能补全功能（插件可能自动安装）
3. **arm-gnu-toolchain** - ARM官方发布的GNU交叉编译工具链，包含arm-none-eabi-gcc等核心编译器，用于生成ARM Cortex-M架构的机器码
4. **Ninja** - 高速构建系统，相比Make具有更快的构建速度和更清晰的输出

需要下载的插件（有一些是必要的，有一些是辅助开发体验的）：

1. clangd（语法提醒，和C/C++插件冲突）
2. Clang-Format（格式化语法）
3. CMake Tools（CMake）
4. Cortex-Debug（调试使用）
5. Cortex-Debug: Device Support Pack - STM32H7（Cortex-Debug配套）
6. MemoryView（Cortex-Debug配套 可以看内存的东西）
7. Peripheral Viewer（Cortex-Debug配套）
8. debug-tracker-vscode（Cortex-Debug配套）
9. RTOS Views（Cortex-Debug配套 可以看RTOS的东西）
10. Serial Monitor（微软官方的串口助手插件，轻量方便但没那么强大）
11. LinkerScript（语法高亮）
12. Output Colorizer（输出栏高亮）
13. Doxygen Documentation Generator（语法高亮）
14. 其他的markdown阅读器 中文汉化 主题 图标等等个人使用的vscode的东西

请从各项目的GitHub发布页面或官方网站下载适用于Windows 64位系统的最新稳定版本，并将相关可执行文件所在的`bin`目录或者其他目录添加到系统的PATH环境变量中。

> 注意：部分资源可能需要通过科学上网获取。当VSCode插件提示安装时，请及时响应并完成安装。

环境变量配置示例

```text
D:\Users\admin\Desktop\work\Toolchain\arm-gnu-toolchain-14.3.rel1\bin
D:\Users\admin\Desktop\work\Toolchain\cmake-4.12.1\bin
D:\Users\admin\Desktop\work\Toolchain\LLVM\bin
D:\Users\admin\Desktop\work\Toolchain\ninja
D:\Users\admin\Desktop\work\Toolchain\OpenOCD-20250710\bin
```

## 二、CMake 构建系统配置

本项目使用 `CMake Tools` VSCode扩展来管理和构建项目。该扩展提供了图形化界面来处理CMake项目的配置、构建和调试操作。

根据 `STM32CubeMX` 生成的 `CMakePresets.json` 文件的定义，项目预设了两种构建配置：

- **Debug**: 包含调试信息（-g），便于调试
- **Release**: 启用优化（-O2），适合最终部署

默认情况下，项目会以Debug模式进行构建。你可以通过VSCode状态栏中的CMake选项快速切换构建类型。

下文的配置界面，均使用Debug模式演示。配置跑完没有报错，就算构建成功。

## 三、clangd 智能代码辅助配置

为了获得最佳的代码编辑体验（如语法高亮、错误检查、自动补全、跳转定义等功能），我们使用 `clangd` 作为语言服务器。以下是详细配置说明：

首先需要配置`compile_commands.json`。它是标准的编译数据库文件，记录了每个源文件的完整编译命令。`clangd` 通过读取此文件来精确理解代码的编译上下文，从而提供准确的语义分析。

该文件由CMake生成，需在CMakeLists.txt中启用：

```yaml
# 启用编译命令导出，便于clangd等工具进行索引
set(CMAKE_EXPORT_COMPILE_COMMANDS TRUE)
```

STM32CubeMX生成的项目通常已默认开启此设置，无需手动添加。

由于 `clangd` 插件默认只在项目根目录查找 `compile_commands.json`，而我们的文件位于 `build/Debug/` 目录下，因此需要在 `.vscode/settings.json` 中指定其位置。加上其他几项相关设置后，工程移植时大部分不用重配，路径相关的几项换机器时要改。

```json
{
    "clangd.arguments": [
        "--compile-commands-dir=build/Debug"
    ]
}
```

> 此配置告诉clangd到`build/Debug`目录下寻找编译命令文件。构建目录不同时，这里要跟着改。

---

## 程序烧录与调试配置指南

### 一、调试工具链组成

1. **OpenOCD (Open On-Chip Debugger)** - 开源的片上调试器，支持多种调试探针和目标芯片，负责与硬件调试器通信并控制目标MCU
2. **Cortex-Debug** - VSCode扩展，提供图形化调试界面，集成GDB前端与OpenOCD控制器

### 二、OpenOCD 烧录配置

OpenOCD通过配置文件（`.cfg`）来定义调试会话的各项参数。以常见的DAP-Link调试器为例，我们需要创建一个个人使用的配置文件（如 `user_daplink.cfg`）：

下面为一个示例，想要修改烧录器和添加其他的设置都可以

```text
# 加载CMSIS-DAP调试探针的驱动配置
source [find interface/cmsis-dap.cfg]

# 设置通信方式为SWD（Serial Wire Debug），这是ARM Cortex-M系列最常用的调试接口
transport select swd

# 指定目标芯片为STM32H7系列，加载对应的内存映射、外设定义和初始化脚本
source [find target/stm32h7x.cfg]
```

写好并保存之后，打开终端并执行以下命令启动OpenOCD并烧录程序：

```bash
openocd -f user_daplink.cfg -c "program build/Debug/Project_bsp.elf verify reset exit"
```

命令参数解释：

- `-f user_daplink.cfg`: 指定使用的配置文件
- `-c "..."`: 传递给OpenOCD的命令字符串
- `program ...`: 烧录指定的ELF文件到Flash
- `verify`: 烧录后校验数据完整性
- `reset`: 烧录完成后重启MCU
- `exit`: 执行完毕后退出OpenOCD

> 注意：ELF文件路径 `build/Debug/Project_bsp.elf` 需根据实际的构建输出路径和项目名称进行调整。对于使用CubeMX生成且采用Debug模式的CMake项目，通常只需修改最终的可执行文件名即可。

### 三、调试

进入到`cortex-debug`插件的设置中，可以使用图形化界面添加，也可以直接进入对应的settings，合理运用ctrl+f搜索功能去添加路径

配置`cortex-debug`中的以下路径，为自己`arm-gnu`、`openocd`的路径。如下

> 路径书写要用双反斜杠 转义字符（windows）。根据自己的路径自己修改

```json
    "cortex-debug.armToolchainPath": "D:\\Users\\admin\\Desktop\\work\\Toolchain\\arm-gnu-toolchain-14.3.rel1\\bin",
    "cortex-debug.armToolchainPath.windows": "D:\\Users\\admin\\Desktop\\work\\Toolchain\\arm-gnu-toolchain-14.3.rel1\\bin",
    "cortex-debug.openocdPath": "D:\\Users\\admin\\Desktop\\work\\Toolchain\\OpenOCD-20250710\\bin\\openocd.exe",
```

构建调试器模板:

可以照着抄，但是需要根据自己的芯片和对应文件的路径修改。

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "cwd": "${workspaceRoot}",
      "type": "cortex-debug",
      "request": "launch",
      "name": "OpenOCD", // 可改名字
      "servertype": "openocd",
      "executable": "build/Debug/Project_bsp.elf",
      // 根据自己的项目位置和名字去修改，如何修改同上
      "runToEntryPoint": "main",
      "configFiles": [
        "interface/cmsis-dap.cfg",
        // 根据自己用的烧录器，具体的文件夹去openocd里面去找
        "target/stm32h7x.cfg"
        // 根据自己用的芯片对应的文件，具体的文件夹去openocd里面去找
      ],
      "liveWatch": {
        // livewatch是开启实时查看变量功能，类似keil的watch，cortexdebug配置好了就能成功
        "enabled": true,
        "samplesPerSecond": 20
      }
    }
  ]
}
```

上面`configFiles`中，两个cfg文件的路径为：

`OpenOCD\share\openocd\scripts\interface`和`OpenOCD\share\openocd\scripts\target`

> 路径以你自己安装的 OpenOCD 为准

在vscode官方的运行与调试按钮，开启对应的调试功能，就可以调试了，可以打断点，看函数堆栈，可以在livewatch栏目里面查看到对应的变量实时变化的数据

配套插件装齐后，调试面板里会多出内存和 RTOS 任务视图。

## 配置好了，如何使用？

右键，用 code 打开文件夹。第一次进去需要配置 CMake 信息，选 Debug 模式，让它跑一遍配置工程，看有没有报错。没问题就可以按 Keil 的方式开发：编译交给 CMake，烧录用 openocd 指令，调试走 cortex-debug 加 VSCode 自带的运行与调试面板。

推荐使用vscode的配置文件功能，去管理对应不同的开发环境的存放位置。运用这种方法就可以实现分开管理这些东西。减少占用，管理更加方便。如果有需要的可以去自行搜索如何使用。以及vscode的常见配置均可以自行去网上搜索
