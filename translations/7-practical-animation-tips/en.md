---
title: "7 Practical Animation Tips (Original)"
description: "Original English text of Emil Kowalski's '7 Practical Animation Tips'."
---

# 7 Practical Animation Tips

> [返回中文译版](./index.md) · Source: [https://emilkowal.ski/ui/7-practical-animation-tips](https://emilkowal.ski/ui/7-practical-animation-tips) · Author: Emil Kowalski

![7 Practical Animation Tips Infographic](/images/7-practical-animation-tips/7-practical-animation-tips.webp)

One mistake I made early in my career was thinking that design, and animations in particular, are an art you either “get” or you don’t.

Everything beautiful felt like magic, and that magic felt completely out of reach.

While it certainly requires developing good intuition, there are loads of tricks you can use to make your animations feel better without having to learn that “magic”.

Here are seven simple ideas you can use to improve your animations today.

## 1. Scale your buttons

The interface should feel as if it’s listening to the user. You should aim to give the user feedback on all of their actions as soon as possible. Submitting a form should show a loading state, copy to clipboard action should show a success state.

One easy way to make your interface feel instantly more responsive is to add a subtle scale down effect when a button is pressed. A scale of `0.97` on the `:active` pseudo-class should do the job.

*(Interactive button press demo available on the [original page](https://emilkowal.ski/ui/7-practical-animation-tips).)*

## 2. Don’t animate from scale(0)

Elements that animate from `scale(0)` can make an animation feel off. Try animating from a higher initial scale instead (0.9+). It makes the movement feel more gentle, natural, and elegant.

*(Interactive comparison demo using an initial scale of `0.93` vs `0` available on the original page.)*

`scale(0)` feels wrong because it looks like the element comes out of nowhere. A higher initial value resembles the real world more. Just like a balloon, even when deflated it has a visible shape, it never disappears completely.

## 3. Don’t delay subsequent tooltips

Tooltips should have a delay before appearing to prevent accidental activation. Once a tooltip is open, hovering over other tooltips should open them with no delay and no animation. This feels faster without defeating the purpose of the initial delay.

Radix and Base UI, two unstyled component libraries, skip the delay once a tooltip is shown. Base UI allows you to skip the animation as well. To do that you’ll need to target the `data-instant` attribute and set the transition duration to `0ms`.

Here’s how the styles would look like to achieve this:

```css
.tooltip {
  transition:
    transform 0.125s ease-out,
    opacity 0.125s ease-out;
  transform-origin: var(--transform-origin);

  &[data-starting-style],
  &[data-ending-style] {
    opacity: 0;
    transform: scale(0.97);
  }

  /** This takes care of disabling subsequent animations */
  &[data-instant] {
    transition-duration: 0ms;
  }
}
```

## 4. Choose the right easing

Easing, which describes the rate at which something changes over a period of time, is the most important part of any animation.

It can make a bad animation look great, and a great animation look bad.

If you are animating something that is entering or exiting the screen, use `ease-out`. It accelerates at the beginning which gives the user a feeling of responsiveness.

The dropdown on the left below uses `ease-in`, which starts slow. The one on the right uses `ease-out`, which starts fast, making the animation feel faster too.

The duration for these dropdowns is identical, `300ms` (you can inspect the code to verify this), but the `ease-in` one feels slower. That’s the difference easing makes.

You could decrease the duration to make `ease-in` work, but this easing is just not made for UI animations. It speeds up at the *end*, which is the opposite of what we want.

Most of the animations you’ve seen so far also use custom easing curves to make them feel better.

The built-in easing curves in CSS are usually not strong enough, which is why I almost never use them. Custom easing feels more energetic.

You can still apply the easing principles, just use a custom `ease-out` for more impact. There are plenty of sites that offer custom variations of all easings, here’s one I recommend: [easings.co](https://easings.co/).

## 5. Make your animations origin-aware

A way to make your popovers feel better is to make them origin-aware. They should scale in from the trigger. You’ll need CSS’s `transform-origin` for this, but its default value is `center`, which is wrong in most cases.

*(Interactive popover origin demo available on the original page.)*

Base UI and Radix UI support origin-aware animations through CSS variables. This means that applying these variables will set the correct origin automatically.

```css
.radix {
  transform-origin: var(--radix-dropdown-menu-content-transform-origin);
}

.baseui {
  transform-origin: var(--transform-origin);
}
```

You might think that the difference is subtle, maybe you don’t even notice it. To be honest, whether you or your users notice it doesn’t matter that much. In the aggregate, unseen details become visible, they compound.

All those unseen details combine to produce something that’s just stunning, like a thousand barely audible voices all singing in tune.

## 6. Keep your animations fast

A faster-spinning spinner makes the app seem to load faster, even though the load time is the same. This improves the perceived performance.

A `180ms` select animation feels more responsive than a `400ms` one.

As a rule of thumb, UI animations should generally stay under `300ms`.

Remove animations or hover interactions altogether if they are seen tens, maybe even hundreds of times a day. Instead of delighting your users, they’ll quickly become annoying and make your interface feel slower.

I go into this topic in more detail in the ["You Don’t Need Animations"](https://emilkowal.ski/ui/you-dont-need-animations) post.

## 7. Use blur when nothing else works

If you tried a few different easings and durations for your animation and something about it still feels off, try adding a bit of `filter: blur()` to mask those imperfections.

*(Interactive button crossfade demo comparing plain crossfade vs `2px` blur + `0.97` active press scale available on the original page.)*

Blur works here because it bridges the visual gap between the old and new states. Without it, you see two distinct objects, which feels less natural.

It tricks the eye into seeing a smooth transition by blending the two states together.

## Continue learning

These tips will level up your animations, but this article only scratches the surface of how an interface can be improved through motion.

In [animations.dev](https://animations.dev) we go way deeper into the theory and practice of great animations. There are videos and interactive components that help you understand the theory, and exercises for you to practice building animations that feel right.
