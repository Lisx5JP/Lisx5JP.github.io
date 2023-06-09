<time>2023-6-7</time>

## 安装

最开始我以为 `sudo pacman -S supercollider` 就可以搞定了，但其实不然，还需要安装一些其他应用来使 SC 能正常工作。

最终需要安装的包有 `jack2` `realtime-privileges` `qjackctl` `alsa-firmware` `alsa-plugins` `alsa-utils` `sc3-plugins` `njconnect` `cadence`。

其实如果只让 SC 跑起来，应该不用安装这么多包，这里安装这么多包是参考了 Mads Kjeldgaard 写的[这篇文章](https://madskjeldgaard.dk/posts/audio-setup-arch-2021/)。

其中 `realtime-privileges` 需要设置权限：

```
sudo pacman -S realtime-privileges
sudo groupadd realtime
sudo usermod -a -G realtime {YOUR_USERNAME}
```

打开 `qjackctl` 修改里面的 interface 到 `hw: Generic_1,0 ALC245 Analog (hw:1,0)` 就有声了。

装完这么多东西，我其实也不了解它们各自的作用，所以可以来看看：

## 都是些什么包？

### realtime-privileges

提高音/视频流处理的优先级，防止处理器可能因为执行其他线程而导致当前音/视频流的中断或不同步。

参考：

- https://jackaudio.org/faq/linux_rt_config.html
- https://wiki.archlinux.org/title/Realtime_process_management

### jack2

最重要的一个包了，官网地址 https://jackaudio.org/ ，它自己的介绍是：

> JACK Audio Connection Kit (or JACK) is a professional sound server API and pair of daemon implementations to provide real-time, low-latency connections for both audio and MIDI data between applications.

FAQ 中进一步解释说：

> It provides a basic infrastructure for audio applications to communicate with each other and with audio hardware. Through JACK, users are enabled to build powerful systems for signal processing and music production.

另外，在 Arch 中使用的是 PulseAudio 来控制电脑的声音，JACK 和它有功能上的重叠和冲突，两者的区别在于：

- PulseAudio 更专注于桌面和移动端的声音控制，而不是降低延迟之类的。

- JACK 更多的是为专业的处理声音的用户设计的，让延迟尽可能小，应用和硬件之间的路径有更完备的路由灵活度，音频也是同步（非异步）执行的。

### qjackctl

控制 JACK 的 GUI 客户端，比如启动或关闭 JACK server， 选择声卡之类的操作。

### alsa-firmware、alsa-plugins、alsa-utils

ALSA 相关的三个包，ALSA 全称 Advanced Linux Sound Architecture， 网址 https://www.alsa-project.org/ 。

根据维基百科的介绍，ALSA 是 Linux 内核中默认的标准音频驱动程序集。一部分的目的是支持声卡的自动配置，另外，JACK 则使用 ALSA 来提供低延迟的专业级音频编辑和混音功能。

### sc3-plugins

SuperCollider 的插件 https://github.com/supercollider/sc3-plugins 。

### njconnect

看起来很古早的一个软件，代码在 SourceForge 上 https://sourceforge.net/projects/njconnect/ ，上次更新已经是2018年了，一个终端应用。好吧，我暂时不知道这个是用来干嘛的，只知道是和 JACK 相关的，先装了吧。

### cadence

JACK 的工具箱，嗯... 同样不知道有哪些功能。

## 使用

SC 跑起来了，后面就都好说了。不过如果只让 SC 跑起来，应该只需要把 JACK 配置好就行，应该只需要安装好 SuperCollider、JACK2 和 qtjackctl 就行。

后面就需要开始学 SC 怎么用了，软件逻辑什么的， cheers！